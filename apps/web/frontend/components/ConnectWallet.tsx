"use client";

import { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsName,
  useEnsAvatar,
} from "wagmi";
import { mainnet } from "viem/chains";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
  });

  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  if (isConnected && address) {
    const displayName =
      ensName ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        {ensAvatar && (
          <img
            src={ensAvatar}
            alt=""
            className="h-7 w-7 rounded-full object-cover ring-2 ring-teal-500/20"
          />
        )}
        <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 text-xs font-medium text-teal-400">
          {displayName}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200"
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
        className="btn-primary rounded-full px-5 py-2.5 text-sm"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>

      {showPicker && connectors.length > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-2 shadow-xl shadow-black/40 backdrop-blur-xl">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => {
                connect({ connector });
                setShowPicker(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.06] transition-colors duration-200"
            >
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt=""
                  className="h-6 w-6 rounded-lg"
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
