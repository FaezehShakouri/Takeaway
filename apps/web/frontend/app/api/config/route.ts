import { NextResponse } from "next/server";

/** Default values when env vars are not set (e.g. local .env or fallback for deploy) */
const DEFAULTS = {
  factoryAddress: "0x72f9BF0733F39E97466a8BF4E1Dee13cBA6a497d",
  registryAddress: "0xdfB82Aa127c2442960444aB0E1a0e4c923e92A5D",
  baseRpcUrl: "https://base.public.blockpi.network/v1/rpc/public",
  mainnetRpcUrl: "https://ethereum-rpc.publicnode.com",
} as const;

/**
 * Runtime config for the frontend. Contract addresses and RPC URLs are read
 * from env at request time, with fallback to defaults when not set.
 */
export async function GET() {
  return NextResponse.json({
    factoryAddress:
      process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? DEFAULTS.factoryAddress,
    registryAddress:
      process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? DEFAULTS.registryAddress,
    baseRpcUrl:
      process.env.NEXT_PUBLIC_BASE_RPC_URL ?? DEFAULTS.baseRpcUrl,
    mainnetRpcUrl:
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? DEFAULTS.mainnetRpcUrl,
  });
}
