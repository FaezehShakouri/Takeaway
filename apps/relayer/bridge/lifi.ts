/**
 * LI.FI bridge integration.
 *
 * Flow (per https://docs.li.fi/introduction/user-flows-and-examples/end-to-end-example):
 *   1. createConfig   – one-time SDK setup
 *   2. getQuote       – single best route with transactionRequest ready to send
 *   3. sendTransaction – send the tx via wallet
 *   4. getStatus      – poll until DONE | FAILED
 */

import type { Chain, Hex } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, base, arbitrum, optimism } from "viem/chains";
import { config } from "../config";

/* ------------------------------------------------------------------ */
/*  Wallet setup                                                       */
/* ------------------------------------------------------------------ */

const account = privateKeyToAccount(config.relayerPrivateKey);
const knownChains: Chain[] = [mainnet, base, arbitrum, optimism];

function getChain(chainId: number): Chain {
  const c = knownChains.find((ch) => ch.id === chainId);
  if (c) return c;
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  } as Chain;
}

function getWalletClient(chainId: number) {
  return createWalletClient({
    account,
    chain: getChain(chainId),
    transport: http(config.rpcUrl),
  });
}

function getPublicClient(chainId: number) {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(config.rpcUrl),
  });
}

/* ------------------------------------------------------------------ */
/*  LI.FI SDK config (once)                                            */
/* ------------------------------------------------------------------ */

let configured = false;

export async function configureLifi(): Promise<void> {
  if (configured) return;
  const { createConfig: lifiCreateConfig, EVM } = await import("@lifi/sdk");

  lifiCreateConfig({
    integrator: "Takeaway",
    providers: [
      EVM({
        getWalletClient: async () => getWalletClient(config.chainId),
        switchChain: async (chainId: number) => getWalletClient(chainId),
      }),
    ],
  });

  configured = true;
  console.log("[lifi] SDK configured – integrator: Takeaway");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const NATIVE = "0x0000000000000000000000000000000000000000" as const;

/** Status poll interval in ms (LI.FI recommends 10-30s). */
const STATUS_POLL_MS = 10_000;

function fmt(wei: string | bigint): string {
  const n = Number(BigInt(wei)) / 1e18;
  return `${n.toFixed(6)} ETH`;
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  Bridge entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Bridge native ETH from Base to `toChainId` / `toAddress` via LI.FI.
 *
 * Steps (per docs):
 *   1. getQuote          – best single route with transactionRequest
 *   2. sendTransaction   – submit the tx via viem wallet
 *   3. getStatus (poll)  – track cross-chain transfer until DONE | FAILED
 */
export async function executeBridge(
  amount: bigint,
  toChainId: number,
  toAddress: string
): Promise<void> {
  const start = Date.now();
  await configureLifi();
  const { getQuote, getStatus } = await import("@lifi/sdk");

  /* ---- 1. Request quote ---- */
  console.log("[lifi] ──────────────────────────────────────");
  console.log("[lifi] Requesting quote");
  console.log("[lifi]   from chain : %d (%s)", config.chainId, getChain(config.chainId).name);
  console.log("[lifi]   to chain   : %d (%s)", toChainId, getChain(toChainId).name);
  console.log("[lifi]   amount     : %s (%s wei)", fmt(amount), amount.toString());
  console.log("[lifi]   fromAddress: %s", account.address);
  console.log("[lifi]   toAddress  : %s", toAddress);

  const quote = await getQuote({
    fromChain: config.chainId,
    toChain: toChainId,
    fromToken: NATIVE,
    toToken: NATIVE,
    fromAmount: amount.toString(),
    fromAddress: account.address,
    toAddress,
  });

  /* ---- Log quote details ---- */
  console.log("[lifi] Quote received [%s]", elapsed(start));
  console.log("[lifi]   tool       : %s", quote.tool);
  console.log("[lifi]   type       : %s", quote.type);
  if (quote.estimate) {
    console.log("[lifi]   toAmount   : %s", fmt(quote.estimate.toAmount));
    console.log(
      "[lifi]   gasCosts   : %s",
      quote.estimate.gasCosts?.map((g) => fmt(g.amount)).join(" + ") ?? "n/a"
    );
    console.log(
      "[lifi]   feeCosts   : %s",
      quote.estimate.feeCosts?.map((f) => fmt(f.amount)).join(" + ") ?? "none"
    );
    console.log("[lifi]   approx time: %ss", quote.estimate.executionDuration);
  }

  if (!quote.transactionRequest) {
    throw new Error("[lifi] Quote did not include transactionRequest");
  }

  /* ---- 2. Send the transaction ---- */
  console.log("[lifi] Sending transaction…");
  const wallet = getWalletClient(config.chainId);
  const pub = getPublicClient(config.chainId);

  const txHash = await wallet.sendTransaction({
    to: quote.transactionRequest.to as `0x${string}`,
    data: quote.transactionRequest.data as Hex,
    value: BigInt(quote.transactionRequest.value ?? 0),
    gasLimit: quote.transactionRequest.gasLimit
      ? BigInt(quote.transactionRequest.gasLimit)
      : undefined,
    chain: getChain(config.chainId),
  });

  console.log("[lifi] Tx submitted: %s [%s]", txHash, elapsed(start));

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  console.log(
    "[lifi] Tx confirmed in block %s (status: %s) [%s]",
    receipt.blockNumber,
    receipt.status,
    elapsed(start)
  );

  if (receipt.status === "reverted") {
    throw new Error(`[lifi] Transaction reverted: ${txHash}`);
  }

  /* ---- 3. Poll status for cross-chain transfers ---- */
  if (config.chainId !== toChainId) {
    console.log("[lifi] Cross-chain transfer – polling status every %ds…", STATUS_POLL_MS / 1000);

    let pollCount = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await sleep(STATUS_POLL_MS);
      pollCount++;

      const statusResponse = await getStatus({
        txHash,
        bridge: quote.tool,
        fromChain: config.chainId,
        toChain: toChainId,
      });

      const s = statusResponse.status;
      const sub = statusResponse.substatus ?? "";

      console.log(
        "[lifi]   poll #%d – status: %s %s [%s]",
        pollCount,
        s,
        sub ? `(${sub})` : "",
        elapsed(start)
      );

      if (s === "DONE") {
        console.log("[lifi] Transfer DONE%s", sub === "PARTIAL" ? " (partial – different token)" : "");
        break;
      }

      if (s === "FAILED") {
        const reason = sub === "REFUNDED"
          ? "Failed but funds refunded on source chain"
          : "Transfer failed";
        throw new Error(`[lifi] ${reason}`);
      }

      // PENDING / NOT_FOUND → keep polling
    }
  }

  console.log("[lifi] Bridge completed [%s]", elapsed(start));
  console.log("[lifi] ──────────────────────────────────────");
}
