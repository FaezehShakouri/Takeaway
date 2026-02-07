import { type Address, type Hash, parseAbiItem } from "viem";
import { publicClient } from "../lib/registry";
import { walletClient, relayerAddress } from "../lib/wallet";
import { getSubdomainNamehash } from "../lib/registry";
import { getDestinationFromEns } from "../lib/ens";
import { config } from "../config";
import { executeBridge } from "../bridge/lifi";

const takeawayDepositAbi = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "withdrawTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Known deposit contract addresses (from Factory.DepositContractCreated). */
const depositContracts = new Set<string>();

function normalizeAddress(a: Address): string {
  return a.toLowerCase();
}

const MAX_BLOCK_RANGE = 50_000n;

/**
 * Fetch all DepositContractCreated events from Factory (paginated in chunks of 50k blocks).
 */
export async function indexExistingDepositContracts(): Promise<void> {
  const currentBlock = await publicClient.getBlockNumber();
  let from = config.fromBlock;

  while (from <= currentBlock) {
    const to = from + MAX_BLOCK_RANGE - 1n > currentBlock ? currentBlock : from + MAX_BLOCK_RANGE - 1n;
    const logs = await publicClient.getLogs({
      address: config.factoryAddress,
      event: parseAbiItem("event DepositContractCreated(address indexed depositContract, bytes32 subdomainNamehash)"),
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const addr = (log.args as { depositContract?: Address }).depositContract;
      if (addr) depositContracts.add(normalizeAddress(addr));
    }
    from = to + 1n;
  }
  console.log("[deposit] Indexed", depositContracts.size, "deposit contract(s)");
}

/**
 * Subscribe to new DepositContractCreated and add to our set, then start watching that contract for Deposit.
 */
export function watchNewDepositContracts(onDeposit: (contract: Address, from: Address, amount: bigint) => void): void {
  publicClient.watchContractEvent({
    address: config.factoryAddress,
    event: parseAbiItem("event DepositContractCreated(address indexed depositContract, bytes32 subdomainNamehash)"),
    onLogs(logs) {
      for (const log of logs) {
        const addr = (log.args as { depositContract?: Address }).depositContract;
        if (addr) {
          depositContracts.add(normalizeAddress(addr));
          console.log("[deposit] New contract:", addr);
          watchDeposits(addr as Address, onDeposit);
        }
      }
    },
  });
}

/**
 * Watch one deposit contract for Deposit events.
 */
function watchDeposits(depositContract: Address, onDeposit: (contract: Address, from: Address, amount: bigint) => void): void {
  publicClient.watchContractEvent({
    address: depositContract,
    event: parseAbiItem("event Deposit(address indexed from, uint256 amount)"),
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { from?: Address; amount?: bigint };
        if (args.from != null && args.amount != null) {
          void onDeposit(depositContract, args.from, args.amount);
        }
      }
    },
  });
}

/**
 * Start watching all known deposit contracts for Deposit events.
 */
export function watchAllDeposits(onDeposit: (contract: Address, from: Address, amount: bigint) => void): void {
  for (const addr of depositContracts) {
    watchDeposits(addr as Address, onDeposit);
  }
}

/**
 * Withdraw contract balance to relayer, then bridge to destination via LI.FI.
 */
export async function processDeposit(depositContract: Address, _from: Address, amount: bigint): Promise<void> {
  try {
    console.log("[deposit] Processing", amount.toString(), "from", depositContract);

    const namehash = await getSubdomainNamehash(depositContract);
    const destination = await getDestinationFromEns(namehash);
    if (!destination) {
      console.warn("[deposit] No ENS destination for contract", depositContract, "- skipping bridge");
      return;
    }

    if (!walletClient) {
      console.error("[deposit] No wallet client - cannot withdraw");
      return;
    }

    const hash = await walletClient.writeContract({
      address: depositContract,
      abi: takeawayDepositAbi,
      functionName: "withdrawTo",
      args: [relayerAddress],
    });
    if (!hash) {
      console.error("[deposit] withdrawTo failed");
      return;
    }
    console.log("[deposit] withdrawTo tx:", hash);
    await publicClient.waitForTransactionReceipt({ hash });

    await executeBridge(amount, destination.chainId, destination.address);
  } catch (err) {
    console.error("[deposit] Error processing deposit:", err);
  }
}
