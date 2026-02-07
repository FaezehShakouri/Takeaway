export const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS
  ? (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`)
  : undefined;
export const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS
  ? (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`)
  : undefined;

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
