import { base } from "viem/chains";

export const supportedChains = [base] as const;
export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const chainIdToSlug: Record<number, string> = {
  [base.id]: "base",
};

/** Destination chains we offer as subname options (labels). */
export const destinationChains = [
  { id: 1, name: "Ethereum", slug: "ethereum", color: "#627EEA", initial: "E" },
  { id: 42161, name: "Arbitrum", slug: "arbitrum", color: "#28A0F0", initial: "A" },
  { id: 8453, name: "Base", slug: "base", color: "#0052FF", initial: "B" },
  { id: 10, name: "Optimism", slug: "optimism", color: "#FF0420", initial: "O" },
] as const;
