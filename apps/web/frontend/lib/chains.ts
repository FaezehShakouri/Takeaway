import { sepolia } from "viem/chains";

export const supportedChains = [sepolia] as const;
export type SupportedChainId = (typeof supportedChains)[number]["id"];

export const chainIdToSlug: Record<number, string> = {
  [sepolia.id]: "sepolia",
};

/** Destination chains we offer as subdomain options (labels). */
export const destinationChains = [
  { id: 11155111, name: "Sepolia", slug: "sepolia" },
  { id: 421614, name: "Arbitrum Sepolia", slug: "arbitrum" },
  { id: 84532, name: "Base Sepolia", slug: "base" },
  { id: 11155420, name: "Optimism Sepolia", slug: "optimism" },
] as const;
