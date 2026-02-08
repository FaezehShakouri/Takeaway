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

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  /* ── Connected state ── */
  if (isConnected && address) {
    const displayName =
      ensName ?? `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-white/60 border border-stone-200/50 pl-1.5 pr-3.5 py-1.5 hover:bg-white/80 hover:border-stone-300/50 transition-all duration-200 cursor-pointer"
        >
          {ensAvatar ? (
            <img
              src={ensAvatar}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-[10px] font-bold text-teal-600">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xs font-medium text-stone-600">
            {displayName}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a8a29e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-xl border border-stone-200/50 bg-white/90 p-1.5 shadow-xl shadow-stone-900/5 backdrop-blur-xl">
            <div className="px-3 py-2 border-b border-stone-100/60 mb-1">
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                Connected as
              </p>
              <p className="text-xs font-mono text-stone-600 truncate">
                {ensName ?? `${address.slice(0, 10)}…${address.slice(-6)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors duration-200"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Not connected ── */
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/20"
        style={{
          background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
        }}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>

      {showMenu && connectors.length > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-2xl border border-stone-200/50 bg-white/90 p-2 shadow-xl shadow-stone-900/5 backdrop-blur-xl">
          {connectors.filter((c) => c.name.toLowerCase() !== "injected").map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => {
                connect({ connector });
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors duration-200"
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
