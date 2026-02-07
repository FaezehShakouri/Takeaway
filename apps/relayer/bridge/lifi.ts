import type { Chain } from "viem";
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia } from "viem/chains";
import { config } from "../config";
import { publicClient } from "../lib/registry";

const account = privateKeyToAccount(config.relayerPrivateKey);
const chains: Chain[] = [sepolia, arbitrumSepolia, baseSepolia, optimismSepolia];

function getChain(chainId: number): Chain {
  const c = chains.find((ch) => ch.id === chainId);
  if (c) return c;
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  } as Chain;
}

const walletClients = new Map<number, ReturnType<typeof createWalletClient>>();
function getWalletClient(chainId: number) {
  let w = walletClients.get(chainId);
  if (!w) {
    w = createWalletClient({
      account,
      chain: getChain(chainId),
      transport: http(config.rpcUrl),
    });
    walletClients.set(chainId, w);
  }
  return w;
}

let lifiConfigured = false;
export async function configureLifi(): Promise<void> {
  if (lifiConfigured) return;
  const { createConfig: lifiCreateConfig, EVM: LifiEVM } = await import("@lifi/sdk");
  lifiCreateConfig({
    integrator: "Takeaway",
    providers: [
      LifiEVM({
        getWalletClient: async () => getWalletClient(config.chainId),
        switchChain: async (chainId: number) => getWalletClient(chainId),
      }),
    ],
  });
  lifiConfigured = true;
}

const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000" as const;

/* ------------------------------------------------------------------ */
/*  Testnet chain IDs (LI.FI doesn't support these)                   */
/* ------------------------------------------------------------------ */
const TESTNET_CHAIN_IDS = new Set([
  11155111, // Sepolia
  421614,   // Arbitrum Sepolia
  84532,    // Base Sepolia
  11155420, // Optimism Sepolia
  5,        // Goerli (deprecated but just in case)
  80001,    // Mumbai
]);

function isTestnet(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.has(chainId);
}

/* ------------------------------------------------------------------ */
/*  Testnet fallback: direct ETH transfer on the source chain          */
/* ------------------------------------------------------------------ */
async function directTransfer(amount: bigint, toAddress: string): Promise<void> {
  console.log("[bridge] Testnet detected – using direct transfer fallback");
  console.log("[bridge] Sending", amount.toString(), "wei to", toAddress, "on chain", config.chainId);

  const wallet = getWalletClient(config.chainId);
  const hash = await wallet.sendTransaction({
    to: toAddress as Address,
    value: amount,
    chain: getChain(config.chainId),
  });

  console.log("[bridge] Direct transfer tx:", hash);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("[bridge] Direct transfer confirmed");
}

/* ------------------------------------------------------------------ */
/*  Main bridge entry point                                            */
/* ------------------------------------------------------------------ */

/**
 * Bridge `amount` wei from current chain to `toChainId` / `toAddress`.
 *
 * - On **mainnet** chains: uses LI.FI to find and execute a cross-chain route.
 * - On **testnets** (Sepolia, etc.): falls back to a direct ETH transfer on
 *   the source chain since LI.FI does not support testnets.
 */
export async function executeBridge(
  amount: bigint,
  toChainId: number,
  toAddress: string
): Promise<void> {
  // Testnet shortcut – LI.FI has no testnet support
  if (isTestnet(config.chainId) || isTestnet(toChainId)) {
    await directTransfer(amount, toAddress);
    return;
  }

  // Mainnet path – use LI.FI
  await configureLifi();
  const { getRoutes, executeRoute } = await import("@lifi/sdk");

  const fromAmount = amount.toString();
  const result = await getRoutes({
    fromChainId: config.chainId,
    toChainId,
    fromTokenAddress: NATIVE_TOKEN,
    toTokenAddress: NATIVE_TOKEN,
    fromAmount,
    fromAddress: account.address,
    toAddress,
  });

  const route = result.routes?.[0];
  if (!route) {
    console.warn("[lifi] No route found for", config.chainId, "->", toChainId);
    return;
  }

  console.log("[lifi] Executing route to", toAddress, "on chain", toChainId);
  try {
    await executeRoute(route, {
      updateRouteHook: (updated) => {
        console.log("[lifi] Route update:", updated.steps?.map((s) => s.execution?.status ?? "pending"));
      },
      acceptExchangeRateUpdateHook: () => Promise.resolve(true),
    });
    console.log("[lifi] Bridge completed");
  } catch (err) {
    console.error("[lifi] Bridge failed:", err);
    throw err;
  }
}
