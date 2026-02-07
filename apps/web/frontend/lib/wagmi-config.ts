"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet, sepolia } from "viem/chains";

export const config = createConfig({
  chains: [sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
