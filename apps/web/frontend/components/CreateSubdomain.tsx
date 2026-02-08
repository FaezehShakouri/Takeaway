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
  creating: "Deploying deposit contract on Base…",
  switchToMainnet: "Switching to Ethereum mainnet…",
  subdomain: "Creating ENS subdomain…",
  setAddr: "Setting address record…",
  setText: "Setting destination records…",
  done: "All set!",
};

const STEP_ORDER: Step[] = [
  "switchToBase",
  "creating",
  "switchToMainnet",
  "subdomain",
  "setAddr",
  "setText",
  "done",
];

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
    if (
      !factoryAddress ||
      !address ||
      !publicClient ||
      !destinationAddress.trim()
    )
      return;

    setError(null);
    setDepositAddr(null);

    try {
      const subdomainNode = namehash(fullSubdomain);
      const parentNode = namehash(ensName);
      const label = labelhash(subdomainLabel);

      /* ========================================================= */
      /*  Phase 1 — Base: deploy deposit contract                  */
      /* ========================================================= */

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

      const receipt = await baseClient.waitForTransactionReceipt({
        hash: createHash,
      });

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

      const resolverAddr = await mainnetClient.readContract({
        address: ensRegistryAddress,
        abi: ensRegistryAbi,
        functionName: "resolver",
        args: [parentNode],
      });

      if (resolverAddr === "0x0000000000000000000000000000000000000000") {
        throw new Error("No resolver found for parent ENS name");
      }

      setStep("switchToMainnet");
      await switchChainAsync({ chainId: mainnet.id });

      const existingOwner = await mainnetClient.readContract({
        address: ensRegistryAddress,
        abi: ensRegistryAbi,
        functionName: "owner",
        args: [subdomainNode],
      });

      const subnameExists =
        existingOwner !== "0x0000000000000000000000000000000000000000";

      if (subnameExists) {
        console.log(
          "[subdomain] %s already exists (owner: %s), skipping creation",
          fullSubdomain,
          existingOwner
        );
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

      setStep("setAddr");
      const addrHash = await writeContractAsync({
        address: resolverAddr,
        abi: ensResolverAbi,
        functionName: "setAddr",
        args: [subdomainNode, createdAddress],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: addrHash });

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

  // Progress calculation
  const currentStepIndex = STEP_ORDER.indexOf(step);
  const progressPercent =
    step === "idle"
      ? 0
      : step === "done"
        ? 100
        : ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Destination chain */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Destination chain
        </label>
        <select
          value={destinationChainSlug}
          onChange={(e) => setDestinationChainSlug(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all appearance-none cursor-pointer"
        >
          {destinationChains.map((c) => (
            <option key={c.id} value={c.slug} className="bg-[#0c0c0c]">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Destination address */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Receiving address on that chain
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-all"
        />
      </div>

      {/* Subdomain preview */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
        <p className="text-xs font-medium text-zinc-500 mb-1">
          Subdomain preview
        </p>
        <p className="font-mono text-zinc-100">
          <span className="gradient-text">{subdomainLabel}</span>
          <span className="text-zinc-500">.{ensName}</span>
        </p>
      </div>

      {/* Progress indicator */}
      {isLoading && (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-2.5 text-sm text-teal-400">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
            {STEP_LABELS[step]}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Success */}
      {step === "done" && depositAddr && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm font-semibold text-emerald-400">All set!</p>
          </div>
          <p className="text-sm text-emerald-400/80">
            Deposit contract{" "}
            <span className="font-mono break-all text-emerald-300">
              {depositAddr}
            </span>{" "}
            deployed and{" "}
            <span className="font-mono text-emerald-300">{fullSubdomain}</span>{" "}
            configured.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 py-3.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-300"
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
