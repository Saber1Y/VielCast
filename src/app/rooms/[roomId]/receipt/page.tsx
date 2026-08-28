"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { teamCode } from "@/lib/teams";
import { GlassCard } from "@/components/ui/GlassCard";
import { TxLineBadge } from "@/components/ui/TxLineBadge";
import { MidnightBadge } from "@/components/ui/MidnightBadge";

interface PayoutSummary {
  participant: string;
  amount: number;
}

interface Participant {
  id: string;
  wallet: string;
  side: string;
  amount: number;
  claimed: boolean;
  joinTx?: string;
}

interface Receipt {
  fixtureId: number;
  roomId: string;
  marketType: string;
  threshold: number;
  entryFee: number;
  finalScore: { home: number; away: number };
  txlineSeq: number;
  settlementTx?: string;
  winnerSide: string;
  payoutSummary: PayoutSummary[];
  homeTeam?: string;
  awayTeam?: string;
  participants?: Participant[];
  status?: string;
}

export default function ReceiptPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/receipt`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setReceipt(data);
      })
      .catch(() => setError("Failed to load receipt"))
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="glass-strong rounded-xl p-6">
          <p className="text-sm text-red-400">{error || "Receipt not found"}</p>
          <Link href="/rooms" className="mt-3 inline-block text-xs font-medium text-cyan-accent">
            Back to rooms →
          </Link>
        </div>
      </div>
    );
  }

  const homeCode = teamCode(receipt.homeTeam ?? "");
  const awayCode = teamCode(receipt.awayTeam ?? "");
  const isOverUnder = receipt.marketType === "TOTAL_GOALS_OVER_UNDER";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/rooms/${roomId}`}
        className="mb-6 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to room
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="section-header">Settlement Receipt</span>
          <TxLineBadge status="verified" />
          <MidnightBadge status="verified" />
        </div>
        <h1 className="text-2xl font-bold">Room Resolved</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Room resolved on Midnight with Sportmonks-verified World Cup data
        </p>
      </div>

      {/* Outcome Summary */}
      <GlassCard className="mb-6 overflow-hidden" hover={false}>
        <div className="border-b border-white/5 bg-gradient-to-r from-green-accent/5 to-cyan-accent/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                {homeCode ? (
                  <img src={`https://flagcdn.com/${homeCode.toLowerCase()}.svg`} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-bold">H</span>
                )}
              </div>
              <span className="text-xs text-zinc-400">{receipt.homeTeam ?? "Home"}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-bold tracking-tight">
                {receipt.finalScore.home} - {receipt.finalScore.away}
              </span>
              {isOverUnder && (
                <span className="text-xs text-zinc-500">
                  Total goals: {receipt.finalScore.home + receipt.finalScore.away}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                {awayCode ? (
                  <img src={`https://flagcdn.com/${awayCode.toLowerCase()}.svg`} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-bold">A</span>
                )}
              </div>
              <span className="text-xs text-zinc-400">{receipt.awayTeam ?? "Away"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/5">
          <div className="p-4 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Room Rule</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {isOverUnder ? `${receipt.threshold}+ goals` : receipt.marketType}
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Winning Side</div>
            <div className="mt-1 text-sm font-semibold text-green-accent">
              {receipt.winnerSide}
            </div>
          </div>
          <div className="p-4 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Total Goals</div>
            <div className="mt-1 text-sm font-semibold text-cyan-accent">
              {receipt.finalScore.home + receipt.finalScore.away}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Verification Trail */}
      <GlassCard className="mb-6 p-5" hover={false}>
        <span className="section-header mb-4 block">Verification Trail</span>
        <div className="flex items-center gap-3">
          {[
            { label: "Sportmonks Score", status: "completed", step: 1 },
            { label: "Winner Rule", status: "completed", step: 2 },
            { label: "Midnight Resolution", status: receipt.settlementTx ? "completed" : "active", step: 3 },
          ].map((v, i) => (
            <>
              <div
                key={v.step}
                className={`verification-step flex-1 ${v.status === "completed" ? "completed" : "active"}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    v.status === "completed"
                      ? "bg-green-accent/20 text-green-accent"
                      : "bg-cyan-accent/20 text-cyan-accent"
                  }`}
                >
                  {v.status === "completed" ? (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l2.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    v.step
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-300">{v.label}</div>
                  <div className="text-[10px] text-zinc-600">
                    {v.status === "completed" ? "Complete" : "Verified"}
                  </div>
                </div>
              </div>
              {i < 2 && (
                <div className="h-px flex-1 bg-white/10" />
              )}
            </>
          ))}
        </div>
      </GlassCard>

      {/* Technical Proof */}
      <GlassCard className="mb-6 p-5" hover={false}>
        <span className="section-header mb-4 block">Technical Proof</span>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-zinc-600">Fixture ID</span>
            <div className="mt-0.5 font-mono text-zinc-300">{receipt.fixtureId}</div>
          </div>
          <div>
            <span className="text-zinc-600">Rule</span>
            <div className="mt-0.5 font-mono text-zinc-300">
              {isOverUnder ? `total_goals > ${receipt.threshold}` : "winner"}
            </div>
          </div>
          <div>
            <span className="text-zinc-600">TxLINE Sequence</span>
            <div className="mt-0.5 font-mono text-zinc-300">{receipt.txlineSeq}</div>
          </div>
          <div>
            <span className="text-zinc-600">Final Score</span>
            <div className="mt-0.5 font-mono text-zinc-300">
              {receipt.finalScore.home} - {receipt.finalScore.away}
            </div>
          </div>
          {receipt.settlementTx && (
            <div className="col-span-2">
              <span className="text-zinc-600">Result Anchor (resolver hash)</span>
              <div className="mt-0.5">
                <div className="font-mono text-xs text-cyan-accent truncate" title={receipt.settlementTx}>
                  {receipt.settlementTx}
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* All participants with outcomes */}
      {receipt.participants && receipt.participants.length > 0 && (
        <GlassCard className="mb-6 p-5" hover={false}>
          <span className="section-header mb-4 block">
            Participants
            {receipt.status === "CLAIMABLE" && (
              <span className="ml-2 text-[10px] font-normal text-amber-400">Claimable</span>
            )}
          </span>
          <div className="flex flex-col gap-1">
            {receipt.participants.map((p, i) => {
              const isWinner = p.side === receipt.winnerSide;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      isWinner ? "bg-green-accent/10 text-green-accent" : "bg-red-500/10 text-red-400"
                    }`}>
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        {isWinner ? (
                          <path d="M2.5 6l2.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        )}
                      </svg>
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {p.wallet.slice(0, 8)}...{p.wallet.slice(-4)}
                    </span>
                    {p.joinTx && p.joinTx !== "midnight" && (
                      <a
                        href={`https://solscan.io/tx/${p.joinTx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-[10px] text-blue-400/60 hover:text-blue-400"
                        title="View on Solscan"
                      >
                        tx
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono ${isWinner ? "text-green-accent" : "text-red-400"}`}>
                      {p.side}
                    </span>
                    <span className="text-xs text-zinc-600">{(p.amount * receipt.entryFee / 1e9).toFixed(6)}</span>
                    <span className={`text-[10px] ${isWinner ? (p.claimed ? "text-green-accent" : "text-amber-400") : "text-zinc-700"}`}>
                      {isWinner ? (p.claimed ? "Claimed" : "Won") : "Lost"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Payouts */}
      <GlassCard className="mb-6 p-5" hover={false}>
        <span className="section-header mb-4 block">Winners Payout</span>
        {receipt.payoutSummary.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-sm text-zinc-600">
            No winners — no participants on the winning side.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {receipt.payoutSummary.map((p, i) => {
              const participant = receipt.participants?.find(
                (pp) => pp.wallet === p.participant
              );
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-accent/10 text-[10px] font-bold text-green-accent">
                      {i + 1}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {p.participant.slice(0, 8)}...{p.participant.slice(-4)}
                    </span>
                    {participant?.claimed && (
                      <span className="text-[10px] text-green-accent/60">Claimed</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-green-accent">
                    {(p.amount / 1e9).toFixed(4)} USDC
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Raw JSON drawer */}
      <GlassCard className="p-5" hover={false}>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex w-full items-center justify-between"
        >
          <span className="section-header">Raw Receipt JSON</span>
          <svg
            className={`h-4 w-4 text-zinc-500 transition-transform ${showRaw ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showRaw && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-white/[0.02] p-4 text-[10px] leading-relaxed text-zinc-500 font-mono">
            {JSON.stringify(receipt, null, 2)}
          </pre>
        )}
      </GlassCard>

      {/* Badges */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <svg className="h-3 w-3 text-cyan-accent" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 6l1.5 1.5L8 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Verified by Sportmonks
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="6" />
          </svg>
          Anchored on Midnight
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <svg className="h-3 w-3 text-green-accent" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6l2.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Resolved by creator ZK
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <svg className="h-3 w-3 text-zinc-500" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          No admin override
        </div>
      </div>
    </div>
  );
}
