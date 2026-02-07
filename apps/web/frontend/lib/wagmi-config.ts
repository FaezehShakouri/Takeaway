"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "viem/chains";

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
