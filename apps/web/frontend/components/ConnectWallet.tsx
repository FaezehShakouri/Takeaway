"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useEnsName, useEnsAvatar } from "wagmi";
import { mainnet } from "viem/chains";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ?? undefined, chainId: mainnet.id });

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  if (isConnected && address) {
    const displayName = ensName ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        {ensAvatar && (
          <img
            src={ensAvatar}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        )}
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {displayName}
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
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        disabled={isPending}
        className="rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-5 py-2.5 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>

      {showPicker && connectors.length > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 shadow-lg">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => {
                connect({ connector });
                setShowPicker(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
            >
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt=""
                  className="h-6 w-6 rounded-md"
                />
              )}
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
