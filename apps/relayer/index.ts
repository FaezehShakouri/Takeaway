/**
 * Takeaway relayer: watches for Deposit events, looks up destination from Registry + ENS,
 * withdraws to relayer, then bridges via LI.FI to the destination chain/address.
 *
 * Set env (see .env.example): RPC_URL, REGISTRY_ADDRESS, FACTORY_ADDRESS, RELAYER_PRIVATE_KEY.
 * Run: bun run start
 */

import { config } from "./config";
import {
  indexExistingDepositContracts,
  watchNewDepositContracts,
  watchAllDeposits,
  processDeposit,
} from "./listeners/deposit";
import { configureLifi } from "./bridge/lifi";

async function main() {
  console.log("[relayer] Starting on chain", config.chainId);
  console.log("[relayer] Registry", config.registryAddress);
  console.log("[relayer] Factory", config.factoryAddress);

  await configureLifi();

  await indexExistingDepositContracts();
  watchAllDeposits(processDeposit);
  watchNewDepositContracts(processDeposit);

  console.log("[relayer] Watching for deposits…");
}

main().catch((err) => {
  console.error("[relayer] Fatal:", err);
  process.exit(1);
});
