"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { namehash, labelhash } from "viem/ens";
import { decodeEventLog, createPublicClient, http, type Address } from "viem";
import { mainnet, base } from "viem/chains";
import {
  factoryAddress,
  takeawayFactoryAbi,
  ensRegistryAddress,
  ensRegistryAbi,
  ensResolverAbi,
} from "@/lib/contracts";
import { destinationChains } from "@/lib/chains";

type Step =
  | "idle"
  | "switchToBase"
  | "creating"
  | "switchToMainnet"
  | "subdomain"
  | "setAddr"
  | "setText"
  | "done";

interface Props {
  ensName: string;
}

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  switchToBase: "Switching to Base…",
  creating: "Creating deposit contract on Base…",
  switchToMainnet: "Switching to Ethereum mainnet…",
  subdomain: "Creating ENS subdomain…",
  setAddr: "Setting address record…",
  setText: "Setting destination text records…",
  done: "Done!",
};

const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC_URL;
const baseRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL;

/** Read-only client pointed at Ethereum mainnet for ENS lookups */
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(mainnetRpc),
});

/** Read-only client pointed at Base for tx receipt confirmations */
const baseClient = createPublicClient({
  chain: base,
  transport: http(baseRpc),
});

export function CreateSubdomain({ ensName }: Props) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [destinationChainSlug, setDestinationChainSlug] = useState<string>(
    destinationChains[0].slug
  );
  const [destinationAddress, setDestinationAddress] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [depositAddr, setDepositAddr] = useState<Address | null>(null);

  const chain = destinationChains.find((c) => c.slug === destinationChainSlug);
  const subdomainLabel = chain?.slug ?? "base";
  const fullSubdomain = `${subdomainLabel}.${ensName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryAddress || !address || !publicClient || !destinationAddress.trim()) return;

    setError(null);
    setDepositAddr(null);

    try {
      const subdomainNode = namehash(fullSubdomain);
      const parentNode = namehash(ensName);
      const label = labelhash(subdomainLabel);

      /* ========================================================= */
      /*  Phase 1 — Base: deploy deposit contract                  */
      /* ========================================================= */

      // Switch to Base if not already on it
      if (chainId !== base.id) {
        setStep("switchToBase");
        await switchChainAsync({ chainId: base.id });
      }

      setStep("creating");
      const createHash = await writeContractAsync({
        address: factoryAddress,
        abi: takeawayFactoryAbi,
        functionName: "createDepositContract",
        args: [subdomainNode],
        chainId: base.id,
      });

      // Wait for Base tx confirmation
      const receipt = await baseClient.waitForTransactionReceipt({
        hash: createHash,
      });

      // Decode DepositContractCreated event
      let createdAddress: Address | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: takeawayFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "DepositContractCreated") {
            createdAddress = (decoded.args as { depositContract: Address })
              .depositContract;
            break;
          }
        } catch {
          // not our event, skip
        }
      }

      if (!createdAddress) {
        throw new Error(
          "Could not find deposit contract address in transaction logs"
        );
      }
      setDepositAddr(createdAddress);

      /* ========================================================= */
      /*  Phase 2 — Ethereum mainnet: set ENS records              */
      /* ========================================================= */

      // Look up parent domain's resolver on mainnet (read-only, no chain switch needed)
      const resolverAddr = await mainnetClient.readContract({
        address: ensRegistryAddress,
        abi: ensRegistryAbi,
        functionName: "resolver",
        args: [parentNode],
      });

      if (resolverAddr === "0x0000000000000000000000000000000000000000") {
        throw new Error("No resolver found for parent ENS name");
      }

      // Now switch wallet to Ethereum mainnet for the write transactions
      setStep("switchToMainnet");
      await switchChainAsync({ chainId: mainnet.id });

      // Step 3: Create subdomain in ENS Registry (skip if it already exists)
      const existingOwner = await mainnetClient.readContract({
        address: ensRegistryAddress,
        abi: ensRegistryAbi,
        functionName: "owner",
        args: [subdomainNode],
      });

      const subnameExists =
        existingOwner !== "0x0000000000000000000000000000000000000000";

      if (subnameExists) {
        console.log("[subdomain] %s already exists (owner: %s), skipping creation", fullSubdomain, existingOwner);
      } else {
        setStep("subdomain");
        const subHash = await writeContractAsync({
          address: ensRegistryAddress,
          abi: ensRegistryAbi,
          functionName: "setSubnodeRecord",
          args: [parentNode, label, address, resolverAddr, BigInt(0)],
          chainId: mainnet.id,
        });
        await mainnetClient.waitForTransactionReceipt({ hash: subHash });
      }

      // Step 4: Set deposit contract as the subdomain address
      setStep("setAddr");
      const addrHash = await writeContractAsync({
        address: resolverAddr,
        abi: ensResolverAbi,
        functionName: "setAddr",
        args: [subdomainNode, createdAddress],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: addrHash });

      // Step 5: Set destination text records
      setStep("setText");
      const chainIdHash = await writeContractAsync({
        address: resolverAddr,
        abi: ensResolverAbi,
        functionName: "setText",
        args: [
          subdomainNode,
          "io.takeaway.destinationChainId",
          chain!.id.toString(),
        ],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: chainIdHash });

      const destHash = await writeContractAsync({
        address: resolverAddr,
        abi: ensResolverAbi,
        functionName: "setText",
        args: [
          subdomainNode,
          "io.takeaway.destinationAddress",
          destinationAddress,
        ],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: destHash });

      setStep("done");
    } catch (err: unknown) {
      const msg =
        (err as { shortMessage?: string })?.shortMessage ||
        (err as Error)?.message ||
        "Transaction failed";
      setError(msg);
      setStep("idle");
    }
  };

  const isLoading = step !== "idle" && step !== "done";
  const canSubmit =
    address &&
    factoryAddress &&
    destinationAddress.trim() &&
    !isLoading &&
    step !== "done";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
          Destination chain
        </label>
        <select
          value={destinationChainSlug}
          onChange={(e) => setDestinationChainSlug(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
        >
          {destinationChains.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
          Destination address (your address on that chain)
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
        />
      </div>
      <div className="rounded-xl bg-[var(--background)] border border-[var(--card-border)] px-4 py-3">
        <p className="text-xs font-medium text-[var(--muted)] mb-1">
          Subdomain preview
        </p>
        <p className="font-mono text-[var(--foreground)]">{fullSubdomain}</p>
      </div>

      {/* Progress indicator */}
      {isLoading && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            {STEP_LABELS[step]}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {step === "done" && depositAddr && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            All set!
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Deposit contract{" "}
            <span className="font-mono break-all">{depositAddr}</span> created
            on Base and configured on{" "}
            <span className="font-mono">{fullSubdomain}</span>.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[var(--accent)] text-white py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading
          ? STEP_LABELS[step]
          : step === "done"
            ? "Done!"
            : `Create ${fullSubdomain}`}
      </button>
    </form>
  );
}
