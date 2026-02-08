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
    <div
      className="min-h-screen text-stone-700"
      style={{
        background:
          "linear-gradient(160deg, #fffbf5 0%, #fef7ed 25%, #f5fdf9 60%, #ecfdf5 100%)",
      }}
    >
      {/* ── Ambient blobs (matching landing) ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-[10%] left-[8%] w-[500px] h-[500px] rounded-full bg-amber-100/30 blur-[120px]"
          style={{ animation: "blob-drift-1 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-teal-100/30 blur-[120px]"
          style={{ animation: "blob-drift-2 22s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[50%] left-[45%] w-[400px] h-[400px] rounded-full bg-sky-50/40 blur-[100px]"
          style={{ animation: "blob-drift-3 15s ease-in-out infinite" }}
        />
      </div>

      {/* ── Floating particles ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {[
          { left: "15%", top: "25%", size: 5, dur: 9, delay: 0, color: "#d97706" },
          { left: "35%", top: "65%", size: 4, dur: 11, delay: 2, color: "#0d9488" },
          { left: "60%", top: "20%", size: 4, dur: 8, delay: 4, color: "#78716c" },
          { left: "80%", top: "50%", size: 5, dur: 10, delay: 1, color: "#0d9488" },
          { left: "45%", top: "75%", size: 4, dur: 9, delay: 6, color: "#d97706" },
          { left: "10%", top: "60%", size: 5, dur: 12, delay: 3, color: "#78716c" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animation: `particle-rise ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b border-stone-200/30 bg-gradient-to-b from-[#fffbf5]/90 via-[#fffbf5]/60 to-transparent backdrop-blur-sm"
        style={{ animation: "fade-in-up 0.8s ease-out both" }}
      >
        <div className="flex items-center justify-between px-6 sm:px-10 py-4">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold tracking-tight text-stone-800"
          >
            Takeaway
          </Link>
          <ConnectWallet />
        </div>
      </nav>

      {/* ── Main content ── */}
      <main
        className="relative mx-auto max-w-2xl px-6 py-5 sm:py-8"
        style={{ animation: "fade-in-up 0.8s ease-out 0.15s both" }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800 mb-1.5">
            Configure Your Chains
          </h1>
          <p className="text-stone-400 text-sm sm:text-base whitespace-nowrap">
            Set up ENS subnames to receive crypto from any chain to your desired chain automatically.
          </p>
        </div>

        {/* ── Not connected ── */}
        {!isConnected ? (
          <div className="rounded-2xl border border-stone-200/40 bg-white/50 p-10 text-center backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100/60 flex items-center justify-center mx-auto mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-500"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-stone-700 font-semibold text-lg mb-2">
              Connect your wallet
            </p>
            <p className="text-stone-400 text-sm mb-6 max-w-sm mx-auto">
              Connect your wallet to create and manage your cross-chain
              subnames.
            </p>
            <ConnectWallet />
          </div>
        ) : ensLoading ? (
          /* ── Loading ENS ── */
          <div className="rounded-2xl border border-stone-200/40 bg-white/50 p-10 text-center backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone-400">Looking up your ENS name…</p>
          </div>
        ) : !hasEns ? (
          /* ── No ENS ── */
          <div className="rounded-2xl border border-stone-200/40 bg-white/50 p-10 text-center backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">🏷️</span>
            </div>
            <p className="text-xl font-semibold text-stone-700 mb-3">
              No ENS name found
            </p>
            <p className="text-stone-400 mb-6 max-w-sm mx-auto">
              You need an ENS name (e.g.{" "}
              <span className="font-mono text-stone-600">alice.eth</span>) to
              create subnames with Takeaway.
            </p>
            <a
              href="https://app.ens.domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
              }}
            >
              Get an ENS name →
            </a>
          </div>
        ) : (
          /* ── Create subname ── */
          <div className="rounded-2xl border border-stone-200/40 bg-white/50 p-6 sm:p-8 backdrop-blur-sm shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
            <div className="mb-6">
              <p className="text-xs font-semibold text-teal-600 tracking-wider uppercase mb-2">
                New subname
              </p>
              <p className="text-lg font-medium text-stone-700">
                Configure a chain for{" "}
                <span className="font-mono font-semibold text-teal-600">
                  {ensName}
                </span>
              </p>
            </div>
            <CreateSubdomain ensName={ensName} />
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
