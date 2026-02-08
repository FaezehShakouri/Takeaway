import { type Address, parseAbiItem } from "viem";
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

/** Last block we've processed – poll picks up from here. */
let lastIndexedBlock = 0n;

/** Poll interval in ms. */
const POLL_INTERVAL_MS = 5_000;

/** Max range per getLogs call (Base public RPCs cap at ~1k blocks). */
const MAX_BLOCK_RANGE = 1000n;

function normalizeAddress(a: Address): string {
  return a.toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  One-time historical index (runs on startup)                        */
/* ------------------------------------------------------------------ */

/**
 * Fetch all DepositContractCreated events from Factory (paginated).
 */
export async function indexExistingDepositContracts(): Promise<void> {
  console.log("[deposit] Fetching current block number…");
  const currentBlock = await publicClient.getBlockNumber();
  const from = config.fromBlock;
  console.log(
    "[deposit] Scanning blocks %s → %s (range %s, chunk size %s)",
    from.toString(),
    currentBlock.toString(),
    (currentBlock - from).toString(),
    MAX_BLOCK_RANGE.toString()
  );

  let cursor = from;
  let chunkIdx = 0;

  while (cursor <= currentBlock) {
    const to =
      cursor + MAX_BLOCK_RANGE - 1n > currentBlock
        ? currentBlock
        : cursor + MAX_BLOCK_RANGE - 1n;

    chunkIdx++;
    try {
      const logs = await publicClient.getLogs({
        address: config.factoryAddress,
        event: parseAbiItem(
          "event DepositContractCreated(address indexed depositContract, bytes32 subdomainNamehash)"
        ),
        fromBlock: cursor,
        toBlock: to,
      });

      for (const log of logs) {
        const addr = (log.args as { depositContract?: Address })
          .depositContract;
        if (addr) {
          depositContracts.add(normalizeAddress(addr));
          console.log("[deposit]   found contract: %s (block %s)", addr, log.blockNumber?.toString());
        }
      }
    } catch (err) {
      console.error(
        "[deposit] getLogs failed for chunk #%d (blocks %s–%s):",
        chunkIdx,
        cursor.toString(),
        to.toString(),
        err
      );
      throw err;
    }
    cursor = to + 1n;
  }

  lastIndexedBlock = currentBlock;
  console.log(
    "[deposit] Indexed %d deposit contract(s) up to block %s (%d chunks)",
    depositContracts.size,
    currentBlock.toString(),
    chunkIdx
  );
}

/* ------------------------------------------------------------------ */
/*  Continuous polling loop (replaces watchContractEvent)               */
/* ------------------------------------------------------------------ */

/**
 * Start a polling loop that checks for new DepositContractCreated and
 * Deposit events every POLL_INTERVAL_MS.  Much more reliable than
 * watchContractEvent on public HTTP RPCs.
 */
export function startPolling(
  onDeposit: (contract: Address, from: Address, amount: bigint) => void
): void {
  async function poll() {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastIndexedBlock) return;

      const from = lastIndexedBlock + 1n;
      const to = currentBlock;

      /* ---- 1. New deposit contracts created by the factory ---- */
      const factoryLogs = await publicClient.getLogs({
        address: config.factoryAddress,
        event: parseAbiItem(
          "event DepositContractCreated(address indexed depositContract, bytes32 subdomainNamehash)"
        ),
        fromBlock: from,
        toBlock: to,
      });

      for (const log of factoryLogs) {
        const addr = (log.args as { depositContract?: Address })
          .depositContract;
        if (addr) {
          const norm = normalizeAddress(addr);
          if (!depositContracts.has(norm)) {
            depositContracts.add(norm);
            console.log("[deposit] New contract detected:", addr);
          }
        }
      }

      /* ---- 2. Deposit events on all known deposit contracts ---- */
      if (depositContracts.size > 0) {
        const addresses = [...depositContracts] as Address[];

        const depositLogs = await publicClient.getLogs({
          address: addresses,
          event: parseAbiItem(
            "event Deposit(address indexed from, uint256 amount)"
          ),
          fromBlock: from,
          toBlock: to,
        });

        for (const log of depositLogs) {
          const args = log.args as { from?: Address; amount?: bigint };
          if (args.from != null && args.amount != null && log.address) {
            console.log(
              "[deposit] Deposit detected:",
              args.amount.toString(),
              "wei from",
              args.from,
              "to contract",
              log.address
            );
            void onDeposit(log.address as Address, args.from, args.amount);
          }
        }
      }

      lastIndexedBlock = to;
    } catch (err) {
      console.error("[deposit] Poll error:", err);
    }
  }

  // Run the first poll immediately, then on interval
  void poll();
  setInterval(poll, POLL_INTERVAL_MS);
  console.log(
    "[deposit] Polling every",
    POLL_INTERVAL_MS / 1000,
    "seconds for new events"
  );
}

/* ------------------------------------------------------------------ */
/*  Process a deposit: withdraw → look up ENS destination → bridge     */
/* ------------------------------------------------------------------ */

/**
 * Withdraw contract balance to relayer, then bridge to destination via LI.FI.
 */
export async function processDeposit(
  depositContract: Address,
  _from: Address,
  amount: bigint
): Promise<void> {
  try {
    console.log(
      "[deposit] Processing",
      amount.toString(),
      "wei from contract",
      depositContract
    );

    const namehash = await getSubdomainNamehash(depositContract);
    const destination = await getDestinationFromEns(namehash);
    if (!destination) {
      console.warn(
        "[deposit] No ENS destination for contract",
        depositContract,
        "- skipping bridge"
      );
      return;
    }

    console.log(
      "[deposit] Destination: chain",
      destination.chainId,
      "address",
      destination.address
    );

    if (!walletClient) {
      console.error("[deposit] No wallet client - cannot withdraw");
      return;
    }

    const hash = await walletClient.writeContract({
      address: depositContract,
      abi: takeawayDepositAbi,
      functionName: "withdrawTo",
      args: [relayerAddress],
      chain: walletClient.chain,
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
