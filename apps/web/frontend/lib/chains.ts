import { base } from "viem/chains";

export const supportedChains = [base] as const;
export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const chainIdToSlug: Record<number, string> = {
  [base.id]: "base",
};

/** Destination chains we offer as subdomain options (labels). */
export const destinationChains = [
  { id: 1, name: "Ethereum", slug: "ethereum" },
  { id: 42161, name: "Arbitrum", slug: "arbitrum" },
  { id: 8453, name: "Base", slug: "base" },
  { id: 10, name: "Optimism", slug: "optimism" },
] as const;
