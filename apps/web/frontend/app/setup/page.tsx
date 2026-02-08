"use client";

import { useAccount, useEnsName } from "wagmi";
import { mainnet } from "viem/chains";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateSubdomain } from "@/components/CreateSubdomain";

export default function SetupPage() {
  const { isConnected, address } = useAccount();
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address,
    chainId: mainnet.id,
  });

  const hasEns = !!ensName;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      {/* Background ambient */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/[0.06] rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight gradient-text"
          >
            Takeaway
          </Link>
          <ConnectWallet />
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="relative mx-auto max-w-2xl px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Configure Your Chains
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Set up ENS subdomains to receive crypto on any chain automatically.
          </p>
        </div>

        {/* ── Not connected ── */}
        {!isConnected ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-400"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-zinc-200 font-semibold text-lg mb-2">
              Connect your wallet
            </p>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
              Connect your wallet to create and manage your cross-chain
              subdomains.
            </p>
            <ConnectWallet />
          </div>
        ) : ensLoading ? (
          /* ── Loading ENS ── */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Looking up your ENS name…</p>
          </div>
        ) : !hasEns ? (
          /* ── No ENS ── */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">🏷️</span>
            </div>
            <p className="text-xl font-semibold mb-3">No ENS name found</p>
            <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
              You need an ENS name (e.g.{" "}
              <span className="font-mono text-zinc-300">alice.eth</span>) to
              create subdomains with Takeaway.
            </p>
            <a
              href="https://app.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-6 py-3"
            >
              Get an ENS name →
            </a>
          </div>
        ) : (
          /* ── Create subdomain ── */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6">
              <p className="text-xs font-semibold text-teal-400 tracking-wider uppercase mb-2">
                New subdomain
              </p>
              <p className="text-lg font-medium">
                Configure a chain for{" "}
                <span className="font-mono gradient-text">{ensName}</span>
              </p>
            </div>
            <CreateSubdomain ensName={ensName} />
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
