"use client";

import { useAccount, useEnsName } from "wagmi";
import { sepolia } from "viem/chains";
import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateSubdomain } from "@/components/CreateSubdomain";

export default function Home() {
  const { isConnected, address } = useAccount();
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address,
    chainId: sepolia.id,
  });

  const hasEns = !!ensName;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold tracking-tight">Takeaway</span>
          <ConnectWallet />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            One name. Every chain.
          </h1>
          <p className="mt-3 text-[var(--muted)] text-lg leading-relaxed">
            Create ENS subdomains per chain. When someone sends ETH to your subdomain, it's bridged
            to your address on that chain.
          </p>
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center shadow-sm">
            <p className="text-[var(--muted)] mb-6">
              Connect your wallet to create and manage subdomains.
            </p>
            <ConnectWallet />
          </div>
        ) : ensLoading ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center shadow-sm">
            <p className="text-[var(--muted)]">Looking up your ENS name…</p>
          </div>
        ) : !hasEns ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center shadow-sm">
            <p className="text-lg font-medium mb-2">No ENS name found</p>
            <p className="text-[var(--muted)] mb-4">
              Your connected wallet does not have an ENS name. You need an ENS name (e.g.{" "}
              <span className="font-mono">alice.eth</span>) to create subdomains with Takeaway.
            </p>
            <a
              href="https://app.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-[var(--accent)] text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get an ENS name
            </a>
          </div>
        ) : (
          <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[var(--muted)]">
              New subdomain
            </h2>
            <p className="mb-6 text-lg font-medium">
              Create a chain-specific subdomain for{" "}
              <span className="font-mono text-[var(--accent)]">{ensName}</span>
            </p>
            <CreateSubdomain ensName={ensName} />
          </section>
        )}
      </main>
    </div>
  );
}
