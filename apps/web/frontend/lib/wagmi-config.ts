"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet, base } from "viem/chains";

const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL;
const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC_URL;

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
