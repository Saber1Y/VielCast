"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { teamCode } from "@/lib/teams";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { TxLineBadge } from "@/components/ui/TxLineBadge";
import { ThresholdMeter } from "@/components/rooms/ThresholdMeter";
import { useLiveScore } from "@/lib/txline/useLiveScore";
import { useMidnightMarket } from "@/lib/midnight/use-midnight-market";
import { loadOwnPosition, saveOwnPosition } from "@/lib/midnight/own-position";

interface Participant {
  id: string;
  wallet: string;
  side: string;
  amount: number;
  claimed: boolean;
  joinTx?: string;
}

interface ActivityLogEntry {
  id: string;
  type: string;
  wallet?: string;
  message: string;
  timestamp: string;
}

interface SettlementReceipt {
  fixtureId: number;
  finalScore: { home: number; away: number };
  winnerSide: string;
  payoutSummary: { participant: string; amount: number }[];
}

interface Room {
  id: string;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  marketType: string;
  threshold: number;
  entryFee: number;
  status: string;
  participants: Participant[];
  createdBy: string;
  createdAt: string;
  winnerSide?: string;
  settlementReceipt?: SettlementReceipt;
  activityLog: ActivityLogEntry[];
  midnightContract?: string;
  resolverHash?: string;
  deployTx?: string;
  deadline?: number;
  initializeTx?: string;
  lockTx?: string;
  settleTx?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

function toBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const {
    connected,
    status,
    error: walletError,
    walletAddress,
    connect,
    joinByAddress,
    findByAddress,
    lockMarket,
    resolveMarket,
    claim,
  } = useMidnightMarket();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<string>("");
  const [amount, setAmount] = useState("1");
  const [joining, setJoining] = useState(false);
  const [settling, setSettling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [locking, setLocking] = useState(false);

  const wallet = walletAddress ?? "";
  const isCreator = room?.createdBy?.toLowerCase() === wallet.toLowerCase();
  const isOverUnder = room?.marketType === "TOTAL_GOALS_OVER_UNDER";
  const isOpen = room?.status === "OPEN";
  const isLocked = room?.status === "LOCKED";
  const isLive = room?.status === "LIVE";
  const isAwaitingProof = room?.status === "AWAITING_PROOF";
  const isSettled = room?.status === "SETTLED" || room?.status === "CLAIMABLE";
  const isClaimable = room?.status === "CLAIMABLE";
  const isCancelled = room?.status === "CANCELLED";
  const isMidnight = Boolean(room?.midnightContract);

  const myParticipant = room?.participants.find(
    (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
  );
  const iWon = myParticipant && myParticipant.side === room?.winnerSide;
  const alreadyClaimed = myParticipant?.claimed;

  const homeCode = teamCode(room?.homeTeam ?? "");
  const awayCode = teamCode(room?.awayTeam ?? "");

  const { score: liveScore } = useLiveScore(
    room?.fixtureId ?? 0
  );
  const totalGoals = liveScore
    ? liveScore.homeScore + liveScore.awayScore
    : null;

  function loadRoom() {
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRoom(data);
      })
      .catch(() => setError("Failed to load room"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  async function handleJoin() {
    if (!connected || !wallet || !room?.midnightContract || !selectedSide) return;
    setJoining(true);
    setError(null);
    try {
      // On-chain: submit a hidden position commitment through Lace.
      const contract = room.midnightContract;
      const stakePerEntry = BigInt(Math.round(room.entryFee / 1e3));
      const position = {
        side: selectedSide === "OVER",
        stake: stakePerEntry * BigInt(Math.max(1, Math.floor(Number(amount)))),
        salt: randomBytes(32),
      };
      const resolverSecret = randomBytes(32);

      await joinByAddress(contract, position, resolverSecret);
      saveOwnPosition(contract, position, resolverSecret);

      // Off-chain: record the participant.
      const confirmRes = await fetch(`/api/rooms/${roomId}/join/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, side: selectedSide, amount: Number(amount) }),
      });
      const confirmData = await confirmRes.json();
      if (confirmData.error) { setError(confirmData.error); return; }

      setRoom(confirmData);
    } catch (e: any) {
      console.error("[join] error:", e);
      setError(e?.message ?? "Failed to join — check console (F12) for details");
    } finally {
      setJoining(false);
    }
  }

  async function handleLock() {
    if (!connected || !room?.midnightContract) return;
    setLocking(true);
    setError(null);
    try {
      const own = loadOwnPosition(room.midnightContract);
      if (!own) {
        setError("Your resolver secret is only available in the session that created this room.");
        return;
      }
      await findByAddress(room.midnightContract, own.position, own.resolverSecret);
      await lockMarket();
      const res = await fetch(`/api/rooms/${roomId}/lock`, { method: "POST" });
      if (!res.ok) { setError((await res.json()).error); return; }
      setRoom(await res.json());
    } catch (e: any) {
      console.error("[lock] error:", e);
      setError(e?.message ?? "Failed to lock the market on-chain");
    } finally {
      setLocking(false);
    }
  }

  async function handleSettle() {
    if (!connected || !wallet || !room?.midnightContract) return;
    setSettling(true);
    setError(null);
    try {
      // Phase 1: fetch the football-data.org final result + winner + result anchor.
      const res = await fetch(`/api/rooms/${roomId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      const own = loadOwnPosition(room.midnightContract);
      if (!own) {
        setError("Only the creator's wallet (with the resolver secret) can settle this room.");
        return;
      }

      // On-chain: resolve as YES(1) / NO(2) with the result anchor.
      await findByAddress(room.midnightContract, own.position, own.resolverSecret);
      const outcome = data.winnerSide === "OVER" || data.winnerSide === "HOME" ? 1 : 2;
      await resolveMarket(outcome, toBytes(data.resultHash));

      // Phase 2: record the settlement receipt.
      const confirm = await fetch(`/api/rooms/${roomId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, onChain: true }),
      });
      const confirmData = await confirm.json();
      if (confirmData.error) { setError(confirmData.error); return; }
      setRoom(confirmData);
    } catch (e: any) {
      console.error("[settle] error:", e);
      setError(e?.message ?? "Failed to settle — check console (F12)");
    } finally {
      setSettling(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this room? All entries will be refundable.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Match was cancelled or postponed" }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setRoom(data);
    } catch {
      setError("Failed to cancel");
    }
  }

  async function handleClaim() {
    if (!connected || !room?.midnightContract) return;
    setClaiming(true);
    setError(null);
    try {
      const own = loadOwnPosition(room.midnightContract);
      if (!own) {
        setError("Your position secret is only available in the session where you joined.");
        return;
      }
      // On-chain: reveal your commitment + nullifier (proves you won the resolved side).
      await findByAddress(room.midnightContract, own.position, own.resolverSecret);
      await claim(randomBytes(32), own.position);

      // Off-chain: record the claim.
      const res = await fetch(`/api/rooms/${roomId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRoom(data);
    } catch (e: any) {
      console.error("[claim] error:", e);
      setError(e?.message ?? "Failed to claim — check console (F12)");
    } finally {
      setClaiming(false);
    }
  }

  const yesPool = room?.participants
    .filter((p) => p.side === "OVER" || p.side === "HOME")
    .reduce((s, p) => s + p.amount, 0) ?? 0;
  const noPool = room?.participants
    .filter((p) => p.side === "UNDER" || p.side === "AWAY")
    .reduce((s, p) => s + p.amount, 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-accent border-t-transparent" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="glass-strong rounded-xl p-6">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <Link href="/rooms" className="text-xs font-medium text-cyan-accent hover:text-cyan-300">
            Back to rooms →
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="glass-strong rounded-xl p-6">
          <p className="text-sm text-red-400 mb-4">Room not found</p>
          <Link href="/rooms" className="text-xs font-medium text-cyan-accent hover:text-cyan-300">
            Back to rooms →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href="/rooms"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to rooms
      </Link>

      {/* Header */}
      <div className="glass-strong rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                {homeCode ? (
                  <img src={`https://flagcdn.com/${homeCode.toLowerCase()}.svg`} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : room.homeTeam.charAt(0)}
              </div>
              <span className="font-semibold text-white">{room.homeTeam}</span>
              {liveScore ? (
                <>
                  <span className="text-sm font-mono font-bold text-green-accent">{liveScore.homeScore}</span>
                  <span className="text-xs text-zinc-600">:</span>
                  <span className="text-sm font-mono font-bold text-green-accent">{liveScore.awayScore}</span>
                </>
              ) : (
                <span className="text-xs text-zinc-600">vs</span>
              )}
              <span className="font-semibold text-white">{room.awayTeam}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                {awayCode ? (
                  <img src={`https://flagcdn.com/${awayCode.toLowerCase()}.svg`} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : room.awayTeam.charAt(0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(isLive || isAwaitingProof) && <TxLineBadge status="active" />}
            <StatusPill status={room.status.toLowerCase() as any} />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-zinc-500">
              {isOverUnder ? "Goal Rush" : "Winner Pick"}
            </span>
            {isOverUnder && (
              <span className="ml-3 text-zinc-600">
                Threshold: <span className="font-mono text-zinc-300">{room.threshold}+</span>
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-600">
            {room.participants.length} participant{room.participants.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column: Threshold + Prediction Pool */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Threshold meter (only for Over/Under) */}
          {isOverUnder && (isOpen || isLive) && (
            <ThresholdMeter current={totalGoals ?? 0} threshold={room.threshold} />
          )}

          {/* Awaiting proof */}
          {isAwaitingProof && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Awaiting Resolution</span>
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-accent border-t-transparent" />
                  <p className="text-sm text-zinc-400">Match finished. The creator resolves the market on-chain...</p>
                  <p className="mt-1 text-xs text-zinc-600">The final football-data.org score is anchored as a hash at resolve time.</p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Cancelled */}
          {isCancelled && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block text-amber-400">Room Cancelled</span>
              <div className="flex items-center justify-center py-3">
                <div className="text-center">
                  <p className="text-sm text-zinc-400">{room.cancelReason ?? "Match did not produce a valid result"}</p>
                  <p className="mt-1 text-xs text-zinc-600">All entries are refundable.</p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Settlement outcome */}
          {(isSettled || isClaimable) && room.settlementReceipt && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Outcome</span>
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="text-center">
                  <div className="text-3xl font-bold">{room.settlementReceipt.finalScore.home}</div>
                  <div className="text-xs text-zinc-500 mt-1">{room.homeTeam}</div>
                </div>
                <div className="text-lg text-zinc-600">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{room.settlementReceipt.finalScore.away}</div>
                  <div className="text-xs text-zinc-500 mt-1">{room.awayTeam}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                <span className="text-zinc-500">Winning side:</span>
                <span className="font-semibold text-green-accent">{room.winnerSide}</span>
                <span className="txline-badge bg-cyan-accent/20 text-cyan-accent border-cyan-accent/30">
                  Verified
                </span>
              </div>
            </GlassCard>
          )}

          {/* Prediction Pool */}
          <GlassCard className="p-5" hover={false}>
            <span className="section-header mb-3 block">Prediction Pool</span>
            {room.participants.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-zinc-600">
                No participants yet. Be the first to join.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-green-accent/20 bg-green-accent/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-green-accent" />
                    <span className="text-sm font-medium text-green-accent">
                      {isOverUnder ? "YES — 3+ goals" : room.homeTeam}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {(yesPool * (room.entryFee || 0) / 1e9).toFixed(4)}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    USDC · {room.participants.filter((p) => p.side === "OVER" || p.side === "HOME").length} participant{room.participants.filter((p) => p.side === "OVER" || p.side === "HOME").length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-sm font-medium text-red-400">
                      {isOverUnder ? "NO — 2 or fewer" : room.awayTeam}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {(noPool * (room.entryFee || 0) / 1e9).toFixed(4)}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    USDC · {room.participants.filter((p) => p.side === "UNDER" || p.side === "AWAY").length} participant{room.participants.filter((p) => p.side === "UNDER" || p.side === "AWAY").length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Participant list */}
          {room.participants.length > 0 && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Participants</span>
              <div className="flex flex-col gap-1">
                {room.participants.map((p) => {
                  const isYes = p.side === "OVER" || p.side === "HOME";
                  const isWinner = isClaimable && p.side === room.winnerSide;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${isYes ? "bg-green-accent" : "bg-red-400"}`} />
                        <span className="text-xs font-mono text-zinc-400">
                          {p.wallet.slice(0, 8)}...{p.wallet.slice(-4)}
                        </span>
                        {isWinner && p.claimed && (
                          <span className="text-[10px] text-green-accent/60">Claimed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${isYes ? "text-green-accent" : "text-red-400"}`}>
                          {p.side}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {(p.amount * (room.entryFee || 0) / 1e9).toFixed(4)} USDC
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>

          {/* Activity log */}
          {room.activityLog.length > 0 && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Activity Log</span>
              <div className="flex flex-col gap-2">
                {room.activityLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                    <div>
                      <span className="text-zinc-400">{log.message}</span>
                      <span className="ml-2 text-[10px] text-zinc-700">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

        {/* Right column: Join + Actions */}
        <div className="flex flex-col gap-4">
          {/* Wallet guard */}
          {!connected && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Privacy Wallet Required</span>
              <p className="text-sm text-zinc-500">
                Connect a Midnight (Lace) wallet to join rooms, lock, settle, and claim with ZK proofs.
              </p>
              <button
                onClick={() => connect().catch((e) => setError(e instanceof Error ? e.message : "Connection failed"))}
                disabled={status === "connecting"}
                className="mt-3 w-full rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {status === "connecting" ? "Connecting..." : "Connect with Lace"}
              </button>
              {walletError && (
                <p className="mt-2 text-xs text-red-400">{walletError}</p>
              )}
            </GlassCard>
          )}
          {/* Already joined info */}
          {isOpen && myParticipant && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">You've Joined</span>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Side: <span className="font-mono text-zinc-300">{myParticipant.side}</span></span>
                <span className="text-zinc-400">Staked: <span className="font-mono text-zinc-300">{(myParticipant.amount * (room.entryFee || 0) / 1e9).toFixed(4)} USDC</span></span>
              </div>
            </GlassCard>
          )}

          {/* Join (if open and not already joined) */}
          {isOpen && !myParticipant && (
            <GlassCard className="p-5" hover={false}>
              <span className="section-header mb-3 block">Join Room</span>

              {!connected ? (
                <p className="text-sm text-zinc-500">
                  Connect your wallet to join this prediction room.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {isOverUnder ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedSide("OVER")}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          selectedSide === "OVER"
                            ? "border-green-accent/40 bg-green-accent/10 text-green-accent"
                            : "border-white/10 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div className="text-sm font-semibold">YES</div>
                        <div className="text-[10px] text-zinc-600">{room.threshold}+ goals</div>
                      </button>
                      <button
                        onClick={() => setSelectedSide("UNDER")}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          selectedSide === "UNDER"
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : "border-white/10 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div className="text-sm font-semibold">NO</div>
                        <div className="text-[10px] text-zinc-600">{room.threshold} or fewer</div>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {["HOME", "DRAW", "AWAY"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSide(s)}
                          className={`rounded-xl border p-3 text-center transition-all ${
                            selectedSide === s
                              ? "border-green-accent/40 bg-green-accent/10 text-green-accent"
                              : "border-white/10 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          <div className="text-sm font-semibold">{s}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        className="glass-input w-20 px-3 py-2 text-sm text-center"
                        placeholder="1"
                      />
                      <span className="text-xs text-zinc-600">entries</span>
                      <button
                        onClick={handleJoin}
                        disabled={joining || !selectedSide}
                        className="ml-auto rounded-lg bg-green-accent px-4 py-2 text-xs font-semibold text-pitch transition-all hover:bg-green-accent/90 disabled:opacity-50"
                      >
                        {joining ? "Proving..." : "Join"}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      Total: <span className="font-mono text-zinc-400">{(Number(amount) * (room.entryFee || 0) / 1e9).toFixed(4)} USDC</span>
                      &nbsp;·&nbsp; Winner gets <span className="font-mono text-zinc-400">2x</span>
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* Verification preview */}
          <GlassCard className="p-4" hover={false}>
            <span className="section-header mb-2 block">Verification</span>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Data source</span>
                <span className="font-medium text-cyan-accent">football-data.org</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Privacy</span>
                <span className="font-mono text-zinc-300">ZK commitment</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Rule</span>
                <span className="font-mono text-zinc-300">
                  {isOverUnder ? `goals > ${room.threshold}` : "winner"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Chain</span>
                <span className="text-zinc-300">Midnight Preprod</span>
              </div>
            </div>
          </GlassCard>

          {connected && (
            <>
              {/* Lock button (creator only) */}
              {isOpen && isCreator && (
                <button
                  onClick={handleLock}
                  disabled={locking}
                  className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                >
                  {locking ? "Locking on-chain..." : "Lock Room (Kickoff)"}
                </button>
              )}

              {/* Settle — creator only */}
              {(isLocked || isAwaitingProof) && isCreator && (
                <button
                  onClick={handleSettle}
                  disabled={settling}
                  className="w-full rounded-xl bg-green-accent px-4 py-2.5 text-xs font-semibold text-pitch transition-all hover:bg-green-accent/90 disabled:opacity-50"
                >
                  {settling ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
                      Resolving on-chain...
                    </span>
                  ) : isAwaitingProof ? (
                    "Retry Fetch & Resolve"
                  ) : (
                    "Settle Room"
                  )}
                </button>
              )}

              {/* Claim — winners only */}
              {isClaimable && iWon && !alreadyClaimed && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-pitch transition-all hover:bg-amber-500/90 disabled:opacity-50"
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
                      Claiming...
                    </span>
                  ) : (
                    "Claim Reward"
                  )}
                </button>
              )}

              {/* Cancel — creator or anyone (permissionless for fairness) */}
              {(isOpen || isLocked || isAwaitingProof) && (
                <button
                  onClick={handleCancel}
                  className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Cancel Room (Refund All)
                </button>
              )}
            </>
          )}

          {/* Receipt link */}
          {(isSettled || isClaimable) && (
            <Link
              href={`/rooms/${room.id}/receipt`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-accent/30 bg-cyan-accent/10 px-4 py-2.5 text-xs font-medium text-cyan-accent transition-colors hover:bg-cyan-accent/20"
            >
              View Settlement Receipt
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}

          {/* Contract info */}
          <div className="flex flex-col gap-1.5 text-[10px] text-zinc-600">
            <div className="font-mono">Room #{room.id}</div>
            {isMidnight && room.midnightContract && (
              <div className="truncate font-mono text-zinc-500" title={room.midnightContract}>
                contract: {room.midnightContract.slice(0, 16)}...
              </div>
            )}
            {isMidnight && room.deployTx && (
              <div className="truncate font-mono text-zinc-500" title={room.deployTx}>
                deploy tx: {room.deployTx.slice(0, 16)}...
              </div>
            )}
            {!isMidnight && room.initializeTx && (
              <a
                href={`https://explorer.solana.com/tx/${room.initializeTx}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                init: {room.initializeTx.slice(0, 12)}...
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
