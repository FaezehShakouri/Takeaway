import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { config } from "../config";

const chain = config.chainId === base.id ? base : { id: config.chainId } as const;
const transport = http(config.rpcUrl);
/** Client for the chain where Takeaway contracts live (Base mainnet). */
export const publicClient = createPublicClient({ chain, transport });

const registryAbi = [
  {
    inputs: [{ name: "contractAddress", type: "address" }],
    name: "getSubdomain",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Get the ENS namehash for the subdomain registered to this deposit contract.
 */
export async function getSubdomainNamehash(depositContractAddress: Address): Promise<bigint> {
  const namehash = await publicClient.readContract({
    address: config.registryAddress,
    abi: registryAbi,
    functionName: "getSubdomain",
    args: [depositContractAddress],
  });
  return namehash as bigint;
}
