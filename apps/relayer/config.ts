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
  /** Sepolia RPC (for Takeaway contracts + ENS if on Sepolia) */
  rpcUrl: required("RPC_URL"),
  /** Chain id where Registry and Factory are deployed (e.g. 11155111 for Sepolia) */
  chainId: parseInt(optional("CHAIN_ID", "11155111"), 10),
  /** TakeawayRegistry contract address */
  registryAddress: required("REGISTRY_ADDRESS") as `0x${string}`,
  /** TakeawayFactory contract address (to watch for new deposit contracts) */
  factoryAddress: required("FACTORY_ADDRESS") as `0x${string}`,
  /** Relayer wallet private key (must match the relayer set in Factory) */
  relayerPrivateKey: required("RELAYER_PRIVATE_KEY") as `0x${string}`,
  /** ENS Registry address (mainnet: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e) */
  ensRegistryAddress: optional("ENS_REGISTRY_ADDRESS", "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e") as `0x${string}`,
  /** RPC for ENS chain (if ENS is on mainnet, set to mainnet RPC; else leave empty to use RPC_URL) */
  ensRpcUrl: optional("ENS_RPC_URL", ""),
  /** Start scanning from this block. Set to the block your Factory was deployed at. */
  fromBlock: BigInt(optional("FROM_BLOCK", "10200000")),
} as const;
