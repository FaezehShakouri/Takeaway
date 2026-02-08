"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet, base } from "viem/chains";

const DEFAULT_BASE_RPC = "https://base.public.blockpi.network/v1/rpc/public";
const DEFAULT_MAINNET_RPC = "https://ethereum-rpc.publicnode.com";

const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? DEFAULT_BASE_RPC;
const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? DEFAULT_MAINNET_RPC;

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [injected()],
  transports: {
    [base.id]: http(baseRpc),
    [mainnet.id]: http(mainnetRpc),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
