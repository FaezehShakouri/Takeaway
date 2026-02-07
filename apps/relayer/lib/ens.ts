import { type Address, type Hash, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { config } from "../config";

/** ENS always lives on Ethereum mainnet – use the dedicated ENS RPC */
const ensTransport = http(config.ensRpcUrl);
const ensClient = createPublicClient({ chain: mainnet, transport: ensTransport });

const ensRegistryAbi = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const resolverAbi = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    name: "text",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Get the resolver address for an ENS node (namehash).
 */
async function getResolver(node: bigint): Promise<Address> {
  const resolver = await ensClient.readContract({
    address: config.ensRegistryAddress,
    abi: ensRegistryAbi,
    functionName: "resolver",
    args: [node as Hash],
  });
  return resolver;
}

/**
 * Get a text record for an ENS node. Returns empty string if not set or resolver is zero.
 */
export async function getEnsText(node: bigint, key: string): Promise<string> {
  const resolverAddress = await getResolver(node);
  if (resolverAddress === "0x0000000000000000000000000000000000000000") return "";
  try {
    const value = await ensClient.readContract({
      address: resolverAddress,
      abi: resolverAbi,
      functionName: "text",
      args: [node as Hash, key],
    });
    return value ?? "";
  } catch {
    return "";
  }
}

const DESTINATION_CHAIN_KEY = "io.takeaway.destinationChainId";
const DESTINATION_ADDRESS_KEY = "io.takeaway.destinationAddress";

export interface Destination {
  chainId: number;
  address: Address;
}

/**
 * Read destination chain and address from ENS text records for a subdomain (by namehash).
 */
export async function getDestinationFromEns(node: bigint): Promise<Destination | null> {
  const [chainIdStr, address] = await Promise.all([
    getEnsText(node, DESTINATION_CHAIN_KEY),
    getEnsText(node, DESTINATION_ADDRESS_KEY),
  ]);
  if (!chainIdStr || !address) return null;
  const chainId = parseInt(chainIdStr, 10);
  if (Number.isNaN(chainId) || address.length < 42) return null;
  return { chainId, address: address as Address };
}
