"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { teamCode } from "@/lib/teams";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  useMidnightMarket,
} from "@/lib/midnight/use-midnight-market";

interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startDate: string;
  competition: string;
}

const STEPS = [
  { num: 1, label: "Match" },
  { num: 2, label: "Prediction" },
  { num: 3, label: "Settings" },
  { num: 4, label: "Deploy" },
];

function toHex(bytes: Uint8Array | null): string {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function CreateRoomForm() {
  const searchParams = useSearchParams();
  const fixtureId = searchParams.get("fixtureId");
  const {
    connected,
    status,
    error: walletError,
    walletAddress,
    connect,
    deployMarket,
  } = useMidnightMarket();

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<string>(fixtureId || "");
  const [side, setSide] = useState<"OVER" | "UNDER">("OVER");
  const [threshold, setThreshold] = useState<string>("3");
  const [entryFee, setEntryFee] = useState<string>("10");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [deployedInfo, setDeployedInfo] = useState<{
    contractAddress: string;
    resolverHash: string;
    deployTx: string;
    deadline: number;
    marketId: string;
    roomId: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/txline/fixtures")
      .then((r) => r.json())
      .then(setFixtures)
      .catch(() => {});
  }, []);

  const selected = fixtures.find((f) => f.id === Number(selectedFixture));
  const homeCode = teamCode(selected?.homeTeam ?? "");
  const awayCode = teamCode(selected?.awayTeam ?? "");

  const kickoffMs = selected ? new Date(selected.startDate).getTime() : 0;
  const deadline = kickoffMs > 0 ? Math.floor(kickoffMs / 1000) + 7200 : 0;

  const [marketId] = useMemo(() => {
    const base = `veilcast:${selectedFixture}:${threshold}`;
    return [
      toHex(new TextEncoder().encode(base.slice(0, 31))) || base,
    ] as const;
  }, [selectedFixture, threshold]);

  async function sha256(input: Uint8Array): Promise<Uint8Array> {
    const digest = await crypto.subtle.digest("SHA-256", input as unknown as BufferSource);
    return new Uint8Array(digest);
  }

  async function handleCreate() {
    if (!selected || !connected) return;
    setCreating(true);
    setError(null);
    try {
      const marketIdBytes = await sha256(
        new TextEncoder().encode(`veilcast:${selected.id}:${threshold}:${side}`),
      );

      const deadlineDigits = BigInt(deadline || Math.floor(Date.now() / 1000) + 86400);

      const resolverSecret = crypto.getRandomValues(new Uint8Array(32));
      const salt = crypto.getRandomValues(new Uint8Array(32));

      const { resolverCommitment } = await import("../../../../contracts/src/witnesses");
      const resolverHashBytes = resolverCommitment(resolverSecret);

      const stake = BigInt(Math.round(Number(entryFee) * 1e6));

      // Deploy the market contract on Midnight Preprod and submit the creator's position.
      const deployed = await deployMarket({
        marketId: marketIdBytes,
        deadline: deadlineDigits,
        resolver: resolverHashBytes,
        position: { side: side === "OVER", stake, salt },
        resolverSecret,
      });

      const contractAddress = deployed.contractAddress;
      if (!contractAddress) throw new Error("Deploy succeeded but no contract address was returned");

      const deployTx = String((deployed.deployedContract.deployTxData.public as any).txId ?? "");

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureId: selected.id,
          homeTeam: selected.homeTeam,
          awayTeam: selected.awayTeam,
          marketType: "TOTAL_GOALS_OVER_UNDER",
          threshold: Number(threshold),
          entryFee: Math.round(Number(entryFee) * 1e9),
          wallet: walletAddress ?? "",
          midnightContract: contractAddress,
          resolverHash: toHex(resolverHashBytes),
          deployTx,
          deadline,
          creatorSide: side,
          creatorStake: 1,
        }),
      });
      const room = await res.json();
      if (room.error) {
        setError(room.error);
        return;
      }
      setDeployedInfo({
        roomId: room.id,
        contractAddress,
        resolverHash: toHex(resolverHashBytes),
        deployTx,
        deadline,
        marketId: toHex(marketIdBytes),
      });
    } catch (e) {
      console.error("[create] deploy error:", e);
      setError(e instanceof Error ? e.message : "Failed to deploy market");
    } finally {
      setCreating(false);
    }
  }

  function nextStep() {
    if (step === 1 && !selectedFixture) return;
    if (step < 4) setStep(step + 1);
  }

  function prevStep() {
    if (step > 1) setStep(step - 1);
  }

  if (deployedInfo) {
    return (
      <div className="mx-auto max-w-2xl">
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-accent/15">
              <svg className="h-5 w-5 text-green-accent" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Market Deployed</h1>
              <p className="text-xs text-zinc-500">
                Your private prediction market is live on Midnight Preprod.
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-cyan-accent/20 bg-cyan-accent/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-accent">Contract</span>
              <span className="font-mono text-cyan-300">
                {deployedInfo.contractAddress.slice(0, 10)}...
                {deployedInfo.contractAddress.slice(-4)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Market ID</span>
              <span className="font-mono text-zinc-400">
                {deployedInfo.marketId.slice(0, 10)}...{deployedInfo.marketId.slice(-4)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Resolver hash</span>
              <span className="font-mono text-zinc-400">
                {deployedInfo.resolverHash.slice(0, 10)}...
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Lock deadline</span>
              <span className="font-mono text-zinc-400">
                {new Date(deployedInfo.deadline * 1000).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mb-5 text-xs text-zinc-500">
            Your position was committed privately on-chain - nobody can see your side or stake until you reveal it at claim time.
          </div>

          <Link
            href={`/rooms/${deployedInfo.roomId}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-accent px-6 py-3 text-sm font-semibold text-pitch transition-colors hover:bg-green-accent/90"
          >
            View Room
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-accent border-t-transparent" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <div className="glass-strong rounded-xl p-8">
          <h1 className="text-xl font-bold">Connect Midnight Wallet</h1>
          <p className="mt-2 text-sm text-zinc-500">
            VeilCast deploys a private prediction market on Midnight. Open the Lace browser extension to connect your wallet.
          </p>
          <button
            onClick={() => connect().catch((e) => setError(e instanceof Error ? e.message : "Connection failed"))}
            className="mt-6 rounded-lg bg-green-accent px-6 py-2.5 text-sm font-semibold text-pitch transition-colors hover:bg-green-accent/90"
          >
            Connect with Lace
          </button>
          {walletError && (
            <p className="mt-3 text-xs text-red-400">{walletError}</p>
          )}
          <p className="mt-4 text-[10px] text-zinc-600">
            Midnight (Preprod) · Lace wallet 4.x
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/fixtures"
        className="mb-6 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 3L5 8l5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to fixtures
      </Link>

      <div className="mb-6">
        <span className="section-header">Create</span>
        <h1 className="text-2xl font-bold">Private Prediction Market</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Deploy a private market on Midnight. Your prediction is committed hidden on-chain and revealed only at claim time.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center gap-2 ${
                s.num === step
                  ? "text-green-accent"
                  : s.num < step
                    ? "text-zinc-400"
                    : "text-zinc-700"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  s.num === step
                    ? "bg-green-accent/20 text-green-accent"
                    : s.num < step
                      ? "bg-green-accent/10 text-green-accent"
                      : "bg-white/5 text-zinc-600"
                }`}
              >
                {s.num < step ? (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6l2.5 2.5L9.5 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  s.num
                )}
              </span>
              <span className="hidden text-xs sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px flex-1 ${s.num < step ? "bg-green-accent/30" : "bg-white/10"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {/* Step 1: Select Match */}
        {step === 1 && (
          <GlassCard className="p-5" hover={false}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-accent/20 text-[10px] font-bold text-green-accent">
                1
              </span>
              <span className="text-sm font-medium text-white">Select Match</span>
            </div>

            <select
              value={selectedFixture}
              onChange={(e) => setSelectedFixture(e.target.value)}
              className="glass-input w-full px-3 py-2 text-sm"
            >
              <option value="" className="bg-pitch">
                Choose a World Cup fixture...
              </option>
              {fixtures.map((f) => (
                <option key={f.id} value={f.id} className="bg-pitch">
                  {f.homeTeam} vs {f.awayTeam}
                </option>
              ))}
            </select>

            {selected && (
              <div className="glass mt-3 flex items-center gap-3 rounded-lg px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold">
                  {homeCode ? (
                    <img
                      src={`https://flagcdn.com/${homeCode.toLowerCase()}.svg`}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    selected.homeTeam.charAt(0)
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-medium text-zinc-200">{selected.homeTeam}</span>
                  <span className="mx-2 text-zinc-600">vs</span>
                  <span className="font-medium text-zinc-200">{selected.awayTeam}</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold">
                  {awayCode ? (
                    <img
                      src={`https://flagcdn.com/${awayCode.toLowerCase()}.svg`}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    selected.awayTeam.charAt(0)
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Step 2: Prediction */}
        {step === 2 && (
          <GlassCard className="p-5" hover={false}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-accent/20 text-[10px] font-bold text-green-accent">
                2
              </span>
              <span className="text-sm font-medium text-white">Your Prediction</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("OVER")}
                className={`rounded-xl border p-4 text-center transition-all ${
                  side === "OVER"
                    ? "border-green-accent/40 bg-green-accent/10 text-green-accent"
                    : "border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                <div className="text-sm font-semibold">OVER {threshold}+</div>
                <div className="mt-1 text-[10px] text-zinc-500">Total goals above the mark</div>
              </button>
              <button
                onClick={() => setSide("UNDER")}
                className={`rounded-xl border p-4 text-center transition-all ${
                  side === "UNDER"
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                <div className="text-sm font-semibold">UNDER {threshold}</div>
                <div className="mt-1 text-[10px] text-zinc-500">Total goals at or below the mark</div>
              </button>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
              Your side and stake are hidden. On-chain you only appear as an anonymous commitment - the market will know
              you joined, but not what you picked until claim time.
            </p>
          </GlassCard>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <GlassCard className="p-5" hover={false}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-accent/20 text-[10px] font-bold text-green-accent">
                3
              </span>
              <span className="text-sm font-medium text-white">Market Settings</span>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Goal Threshold</label>
                <input
                  type="number"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  OVER wins if total goals &gt; {threshold}. UNDER wins if total goals &lt;= {threshold}.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Entry Stake (USDC)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[10px] text-zinc-600">
                  Staked privately per entry. Winner claims 2x their stake from the pool. Kept hidden until claim.
                </p>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="mb-2 text-xs font-medium text-zinc-300">Market Rules</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-zinc-600">Stake</span>
                    <div className="font-mono text-zinc-400">{entryFee || "10"} USDC</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Network</span>
                    <div className="font-mono text-zinc-400">Midnight Preprod</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Closes at</span>
                    <div className="font-mono text-zinc-400">
                      {selected ? new Date(selected.startDate).toLocaleString() : "Kickoff"}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Privacy</span>
                    <div className="font-mono text-zinc-400">ZK commitment</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Step 4: Deploy Preview */}
        {step === 4 && selected && (
          <GlassCard className="p-5" hover={false}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-accent/20 text-[10px] font-bold text-green-accent">
                4
              </span>
              <span className="text-sm font-medium text-white">Deploy Preview</span>
            </div>

            <div className="glass mb-4 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white">
                {selected.homeTeam} vs {selected.awayTeam}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                OVER {threshold}+ / UNDER {threshold} · {entryFee} USDC stake
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">Your side</span>
                <div className="mt-0.5 font-mono text-zinc-300">{side}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">Resolution Source</span>
                <div className="mt-0.5 font-medium text-cyan-accent">Sportmonks final score</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">On-chain</span>
                <div className="mt-0.5 font-mono text-zinc-300">Midnight Preprod</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">Answer reveal</span>
                <div className="mt-0.5 font-mono text-zinc-300">ZK at claim</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">Market ID</span>
                <div className="mt-0.5 font-mono text-zinc-400">{marketId.slice(0, 12)}...</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-zinc-600">Lock deadline</span>
                <div className="mt-0.5 font-mono text-zinc-400">
                  {deadline ? new Date(deadline * 1000).toLocaleString() : "-"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-green-accent/15 bg-green-accent/[0.03] p-3">
              <span className="text-[10px] font-medium text-green-accent">
                What happens on deploy
              </span>
              <ul className="mt-2 flex flex-col gap-1 text-[10px] leading-relaxed text-zinc-500">
                <li>1. Lace signs & submits the contract transaction to Midnight Preprod.</li>
                <li>2. Your position commitment (hidden side + stake) is submitted in a second ZK transaction.</li>
                <li>3. Your wallet holds the private salt - nothing about your pick is visible on-chain.</li>
              </ul>
            </div>
          </GlassCard>
        )}

        {(error || walletError) && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error || walletError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="rounded-xl border border-white/10 px-6 py-3 text-xs font-medium text-zinc-400 hover:border-white/20 transition-colors"
            >
              Back
            </button>
          ) : (
            <Link
              href="/fixtures"
              className="rounded-xl border border-white/10 px-6 py-3 text-xs font-medium text-zinc-400 hover:border-white/20 transition-colors"
            >
              Cancel
            </Link>
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              disabled={step === 1 && !selectedFixture}
              className="flex-1 rounded-xl bg-green-accent px-6 py-3 text-xs font-semibold text-pitch transition-all hover:bg-green-accent/90 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 rounded-xl bg-green-accent px-6 py-3 text-sm font-semibold text-pitch transition-all hover:bg-green-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-pitch border-t-transparent" />
                  Deploying Market...
                </span>
              ) : (
                "Deploy Private Market"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-accent border-t-transparent" />
        </div>
      }
    >
      <CreateRoomForm />
    </Suspense>
  );
}