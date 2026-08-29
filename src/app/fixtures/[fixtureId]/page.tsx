"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TxLineBadge } from "@/components/ui/TxLineBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { GlassCard } from "@/components/ui/GlassCard";
import { LiveScoreBanner } from "@/components/fixtures/LiveScoreBanner";
import { useLiveScore } from "@/lib/txline/useLiveScore";
import { ScoreSkeleton } from "@/components/ui/Skeleton";

interface FixtureInfo {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startDate: string;
  status: string;
  competition?: string;
}

const ROOM_TEMPLATES = [
  {
    name: "Goal Rush",
    prompt: "Will this match have 3+ goals?",
    rule: "YES wins if total goals are 3 or more. NO wins if 2 or fewer.",
    statKeys: "1 + 2",
  },
  {
    name: "Winner Pick",
    prompt: "Who wins the match?",
    rule: "Pick the winning team. Draw counts as a third option.",
    statKeys: "winner",
  },
  {
    name: "Super Cup",
    prompt: "Will the number of corners exceed 9.5?",
    rule: "YES wins if total corners are 10 or more. NO wins if 9 or fewer.",
    statKeys: "corners",
  },
  {
    name: "Discipline Meter",
    prompt: "Will cards cross the target?",
    rule: "Predict whether total cards (yellow + red) will exceed 3.5.",
    statKeys: "cards",
  },
];

export default function FixtureDetailPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;
  const [fixture, setFixture] = useState<FixtureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { score: liveScore } = useLiveScore(Number(fixtureId));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/txline/fixtures");
        const fixtures: FixtureInfo[] = await res.json();
        const match = fixtures.find((f) => f.id === Number(fixtureId));
        if (match) setFixture(match);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fixtureId]);

  const isLive = liveScore?.status === "in_progress";
  const isFinished = liveScore?.status === "finished";
  const hasScore = liveScore !== null && (isLive || isFinished);

  const isUpcoming = fixture?.status === "upcoming" || fixture?.status === "scheduled";

  if (loading && !fixture) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
        <div className="glass-strong rounded-2xl p-6">
          <div className="mb-4 flex justify-between">
            <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-white/5" />
          </div>
          <ScoreSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="glass-strong rounded-xl p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href="/fixtures"
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to fixtures
      </Link>

      {/* Match header */}
      <div className="glass-strong rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              {fixture?.competition ?? "Premier League or La Liga"}
            </span>
            {fixture && (
              <span className="text-[10px] text-zinc-600">
                {new Date(fixture.startDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive && <TxLineBadge status="active" />}
            {isFinished && <TxLineBadge status="verified" />}
            <StatusPill status={isLive ? "live" : isFinished ? "final" : "upcoming"} />
            {isUpcoming && (
              <span className="rounded-md border border-green-accent/20 bg-green-accent/5 px-2 py-0.5 text-[10px] font-medium text-green-accent">
                Create Room Open
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <LiveScoreBanner
          fixtureId={Number(fixtureId)}
          homeTeam={fixture?.homeTeam ?? ""}
          awayTeam={fixture?.awayTeam ?? ""}
          initialHomeScore={liveScore?.homeScore}
          initialAwayScore={liveScore?.awayScore}
          isLive={isLive}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Match board */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Stats panel */}
          {liveScore && (
            <GlassCard className="p-4" hover={false}>
              <span className="section-header mb-3 block">Match Stats</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-mono text-zinc-600">Score</div>
                  <div className="text-sm font-mono font-medium text-zinc-200">
                    {liveScore.homeScore} - {liveScore.awayScore}
                  </div>
                </div>
                {liveScore.period && (
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <div className="text-[10px] font-mono text-zinc-600">Minute</div>
                    <div className="text-sm font-mono font-medium text-zinc-200">
                      {liveScore.period}
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-mono text-zinc-600">Status</div>
                  <div className="text-sm font-mono font-medium text-zinc-200">
                    {liveScore.status}
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="text-[10px] font-mono text-zinc-600">Seq</div>
                  <div className="text-sm font-mono font-medium text-zinc-200">
                    {liveScore.seq}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Data panel */}
          <GlassCard className="p-4" hover={false}>
            <span className="section-header mb-3 block">TxLINE Data</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-zinc-600">Fixture ID</span>
                <div className="font-mono text-zinc-300">{fixtureId}</div>
              </div>
              {liveScore && (
                <>
                  <div>
                    <span className="text-zinc-600">Sequence</span>
                    <div className="font-mono text-zinc-300">{liveScore.seq}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Status</span>
                    <div className="font-mono text-zinc-300">{liveScore.status}</div>
                  </div>
                  <div>
                    <span className="text-zinc-600">Period</span>
                    <div className="font-mono text-zinc-300">
                      {liveScore.period ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Create prediction panel */}
        <div className="flex flex-col gap-3">
          <span className="section-header">Start a Room</span>
          {isUpcoming ? (
            ROOM_TEMPLATES.map((tpl) => (
              <Link
                key={tpl.name}
                href={`/rooms/create?fixtureId=${fixtureId}&template=${tpl.name}`}
                className="glass-card group p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {tpl.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">{tpl.prompt}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      TxLINE: {tpl.statKeys}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-accent"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ))
          ) : isLive ? (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-zinc-400">Match is in progress</span>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Room creation is disabled while the match is live. View existing rooms under My Rooms.
              </p>
            </div>
          ) : (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-zinc-500/10 px-1.5 py-0.5 text-zinc-500">Final</span>
                <span className="text-zinc-400">Match has ended</span>
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                Rooms can only be created before kickoff. View settlement receipts for existing rooms under My Rooms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
