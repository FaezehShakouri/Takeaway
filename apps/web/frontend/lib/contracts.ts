const DEFAULT_FACTORY = "0x72f9BF0733F39E97466a8BF4E1Dee13cBA6a497d" as `0x${string}`;
const DEFAULT_REGISTRY = "0xdfB82Aa127c2442960444aB0E1a0e4c923e92A5D" as `0x${string}`;

export const factoryAddress = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  DEFAULT_FACTORY) as `0x${string}`;
export const registryAddress = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
  DEFAULT_REGISTRY) as `0x${string}`;

/** ENS Registry – same address on mainnet & Sepolia */
export const ensRegistryAddress =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as `0x${string}`;

/* ------------------------------------------------------------------ */
/*  Takeaway Factory ABI (includes DepositContractCreated event)      */
/* ------------------------------------------------------------------ */
export const takeawayFactoryAbi = [
  {
    inputs: [
      { name: "_registry", type: "address" },
      { name: "_relayer", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ name: "subdomainNamehash", type: "bytes32" }],
    name: "createDepositContract",
    outputs: [{ name: "depositContract", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "depositContract", type: "address" },
      { indexed: false, name: "subdomainNamehash", type: "bytes32" },
    ],
    name: "DepositContractCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "registry",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "relayer",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  ENS Registry ABI (resolver lookup + subdomain creation)           */
/* ------------------------------------------------------------------ */
export const ensRegistryAbi = [
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
    ],
    name: "setSubnodeRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  ENS Public Resolver ABI (setAddr + setText)                       */
/* ------------------------------------------------------------------ */
export const ensResolverAbi = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "a", type: "address" },
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    name: "setText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
