/**
 * Relayer config from env. Copy .env.example to .env and fill in values.
 */
const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

const optional = (key: string, def: string): string => process.env[key] ?? def;

export const config = {
  /** Base mainnet RPC (where Takeaway contracts are deployed) */
  rpcUrl: required("RPC_URL"),
  /** Chain id where Registry and Factory are deployed (8453 = Base mainnet) */
  chainId: parseInt(optional("CHAIN_ID", "8453"), 10),
  /** TakeawayRegistry contract address */
  registryAddress: required("REGISTRY_ADDRESS") as `0x${string}`,
  /** TakeawayFactory contract address (to watch for new deposit contracts) */
  factoryAddress: required("FACTORY_ADDRESS") as `0x${string}`,
  /** Relayer wallet private key (must match the relayer set in Factory) */
  relayerPrivateKey: required("RELAYER_PRIVATE_KEY") as `0x${string}`,
  /** ENS Registry address (Ethereum mainnet) */
  ensRegistryAddress: optional("ENS_REGISTRY_ADDRESS", "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e") as `0x${string}`,
  /** Ethereum mainnet RPC for ENS lookups (required – ENS lives on L1) */
  ensRpcUrl: required("ENS_RPC_URL"),
  /** Start scanning from this block. Set to the block your Factory was deployed at on Base. */
  fromBlock: BigInt(optional("FROM_BLOCK", "0")),
} as const;
