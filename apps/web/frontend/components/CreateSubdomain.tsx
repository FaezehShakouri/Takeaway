"use client";

import { useState, useEffect } from "react";
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
  subdomain: "Creating ENS subname…",
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

/** Check which subnames already exist for a given ENS name */
async function queryExistingSubnames(ensName: string) {
  const results = await Promise.all(
    destinationChains.map(async (chain) => {
      try {
        const node = namehash(`${chain.slug}.${ensName}`);
        const owner = await mainnetClient.readContract({
          address: ensRegistryAddress,
          abi: ensRegistryAbi,
          functionName: "owner",
          args: [node],
        });
        return {
          ...chain,
          exists:
            owner !== "0x0000000000000000000000000000000000000000",
        };
      } catch {
        return { ...chain, exists: false };
      }
    })
  );
  return results;
}

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

  // Existing subnames
  const [existingSubnames, setExistingSubnames] = useState<
    Array<(typeof destinationChains)[number] & { exists: boolean }>
  >([]);
  const [loadingSubnames, setLoadingSubnames] = useState(true);

  useEffect(() => {
    setLoadingSubnames(true);
    queryExistingSubnames(ensName)
      .then(setExistingSubnames)
      .finally(() => setLoadingSubnames(false));
  }, [ensName]);

  const configuredChains = existingSubnames.filter((c) => c.exists);

  const chain = destinationChains.find((c) => c.slug === destinationChainSlug);
  const subnameLabel = chain?.slug ?? "base";
  const fullSubname = `${subnameLabel}.${ensName}`;

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
      const subnameNode = namehash(fullSubname);
      const parentNode = namehash(ensName);
      const label = labelhash(subnameLabel);

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
        args: [subnameNode],
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
        args: [subnameNode],
      });

      const subnameExists =
        existingOwner !== "0x0000000000000000000000000000000000000000";

      if (subnameExists) {
        console.log(
          "[subname] %s already exists (owner: %s), skipping creation",
          fullSubname,
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
        args: [subnameNode, createdAddress],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: addrHash });

      setStep("setText");
      const chainIdHash = await writeContractAsync({
        address: resolverAddr,
        abi: ensResolverAbi,
        functionName: "setText",
        args: [
          subnameNode,
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
          subnameNode,
          "io.takeaway.destinationAddress",
          destinationAddress,
        ],
        chainId: mainnet.id,
      });
      await mainnetClient.waitForTransactionReceipt({ hash: destHash });

      setStep("done");

      // Refresh existing subnames
      queryExistingSubnames(ensName).then(setExistingSubnames);
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
    <div className="space-y-6">
      {/* ── Existing subnames ── */}
      {loadingSubnames ? (
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
          Checking existing subnames…
        </div>
      ) : configuredChains.length > 0 ? (
        <div className="rounded-xl bg-teal-50/50 border border-teal-200/40 px-4 py-3">
          <p className="text-xs font-semibold text-teal-600 tracking-wider uppercase mb-2.5">
            Active subnames
          </p>
          <div className="flex flex-wrap gap-2">
            {configuredChains.map((c) => (
              <span
                key={c.slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-teal-200/50 px-3 py-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-xs font-mono text-stone-600">
                  {c.slug}.{ensName}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Create form ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Destination chain — button group */}
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2.5">
            Destination chain
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {destinationChains.map((c) => {
              const isSelected = c.slug === destinationChainSlug;
              const isConfigured = existingSubnames.find(
                (e) => e.slug === c.slug
              )?.exists;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setDestinationChainSlug(c.slug)}
                  className={`relative rounded-xl px-3 py-3 flex flex-col items-center gap-2 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-white/80 border-teal-300/70 shadow-[0_2px_12px_rgba(20,184,166,0.1)]"
                      : "bg-white/40 border-stone-200/50 hover:bg-white/60 hover:border-stone-300/50"
                  }`}
                >
                  {/* Chain badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isSelected ? "scale-110" : "opacity-60"
                    }`}
                    style={{ backgroundColor: c.color }}
                  >
                    <span className="text-[11px] font-bold text-white">
                      {c.initial}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors duration-200 ${
                      isSelected ? "text-stone-700" : "text-stone-400"
                    }`}
                  >
                    {c.name}
                  </span>

                  {/* Already configured indicator */}
                  {isConfigured && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Destination address */}
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">
            Receiving address on {chain?.name ?? "that chain"}
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            className="w-full rounded-xl border border-stone-200/60 bg-white/60 px-4 py-3 font-mono text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400/50 transition-all"
          />
        </div>

        {/* Subname preview */}
        <div className="rounded-xl bg-white/40 border border-stone-200/40 px-4 py-3">
          <p className="text-xs font-medium text-stone-400 mb-1">
            Subname preview
          </p>
          <p className="font-mono text-stone-700">
            <span className="font-semibold text-teal-600">{subnameLabel}</span>
            <span className="text-stone-400">.{ensName}</span>
          </p>
        </div>

        {/* Progress indicator */}
        {isLoading && (
          <div className="space-y-3">
            <div className="h-1 rounded-full bg-stone-200/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #14b8a6, #06b6d4)",
                }}
              />
            </div>
            <div className="flex items-center gap-2.5 text-sm text-teal-600">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
              {STEP_LABELS[step]}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200/60 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {step === "done" && depositAddr && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-4 space-y-2">
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
                className="text-emerald-500"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-sm font-semibold text-emerald-600">All set!</p>
            </div>
            <p className="text-sm text-emerald-600/80">
              Deposit contract{" "}
              <span className="font-mono break-all text-emerald-700">
                {depositAddr}
              </span>{" "}
              deployed and{" "}
              <span className="font-mono text-emerald-700">{fullSubname}</span>{" "}
              configured.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
          }}
        >
          {isLoading
            ? STEP_LABELS[step]
            : step === "done"
              ? "Done!"
              : `Create ${fullSubname}`}
        </button>
      </form>
    </div>
  );
}
