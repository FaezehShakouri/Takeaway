"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { namehash } from "viem/ens";
import { factoryAddress, takeawayFactoryAbi } from "@/lib/contracts";
import { destinationChains } from "@/lib/chains";

export function CreateSubdomain() {
  const { address } = useAccount();
  const [parentName, setParentName] = useState("");
  const [destinationChainSlug, setDestinationChainSlug] = useState<string>(destinationChains[0].slug);
  const [destinationAddress, setDestinationAddress] = useState("");

  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const chain = destinationChains.find((c) => c.slug === destinationChainSlug);
  const subdomainLabel = chain?.slug ?? "sepolia";
  const fullSubdomain = parentName ? `${subdomainLabel}.${parentName}` : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = factoryAddress;
    if (!parentName.trim() || !destinationAddress.trim() || !addr) return;
    const subdomainNamehash = namehash(fullSubdomain);
    writeContract({
      address: addr,
      abi: takeawayFactoryAbi,
      functionName: "createDepositContract",
      args: [subdomainNamehash],
    } as Parameters<typeof writeContract>[0]);
  };

  const isLoading = isWritePending || isConfirming;
  const canSubmit =
    address &&
    factoryAddress &&
    parentName.trim() &&
    destinationAddress.trim() &&
    !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
          Your ENS name (parent)
        </label>
        <input
          type="text"
          placeholder="alice.eth"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
        />
      </div>
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
          Destination address (on that chain)
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-shadow"
        />
      </div>
      {fullSubdomain && (
        <p className="text-sm text-[var(--muted)]">
          Subdomain: <span className="font-mono text-[var(--foreground)]">{fullSubdomain}</span>
        </p>
      )}
      {writeError && (
        <p className="text-sm text-red-600 dark:text-red-400">{writeError.message}</p>
      )}
      {isSuccess && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Deposit contract created. Set this subdomain and destination in ENS (e.g. app.ens.domains).
        </p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[var(--accent)] text-white py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isLoading ? "Creating…" : "Create subdomain"}
      </button>
    </form>
  );
}
