"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Single connect: use first available connector (injected / browser wallet)
  const connector = connectors[0];

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {short}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connector && connect({ connector })}
      disabled={isPending || !connector}
      className="rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-5 py-2.5 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
