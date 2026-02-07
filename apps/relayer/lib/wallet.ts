import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { config } from "../config";

const chain = config.chainId === base.id ? base : { id: config.chainId } as const;
const account = privateKeyToAccount(config.relayerPrivateKey);
export const walletClient = createWalletClient({
  account,
  chain,
  transport: http(config.rpcUrl),
});

export const relayerAddress = account.address;
