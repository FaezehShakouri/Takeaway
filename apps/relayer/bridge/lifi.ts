import type { Chain } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia } from "viem/chains";
import { config } from "../config";

const account = privateKeyToAccount(config.relayerPrivateKey);
const chains: Chain[] = [sepolia, arbitrumSepolia, baseSepolia, optimismSepolia];

function getChain(chainId: number): Chain {
  const c = chains.find((ch) => ch.id === chainId);
  if (c) return c;
  return { id: chainId, name: `Chain ${chainId}`, nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" }, rpcUrls: { default: { http: [config.rpcUrl] } } } as Chain;
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

/**
 * Bridge `amount` wei from current chain to `toChainId` and send to `toAddress` using LI.FI.
 */
export async function executeBridge(
  amount: bigint,
  toChainId: number,
  toAddress: string
): Promise<void> {
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
