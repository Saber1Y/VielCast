"use client";

import { useState } from "react";
import { useMidnightMarket } from "@/lib/midnight/use-midnight-market";

export function WalletButton() {
  const { connected, status, walletAddress, connect, error } = useMidnightMarket();
  const [connecting, setConnecting] = useState(false);

  if (connected && walletAddress) {
    const short = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return (
      <span
        className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300"
        title={walletAddress}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {short}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        setConnecting(true);
        connect().catch(() => {}).finally(() => setConnecting(false));
      }}
      disabled={connecting || status === "connecting"}
      title={error ?? "Connect Lace wallet"}
      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
    >
      {connecting || status === "connecting" ? "Connecting..." : "Connect Lace"}
    </button>
  );
}
