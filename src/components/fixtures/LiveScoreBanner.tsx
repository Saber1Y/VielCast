"use client";

import { useLiveScore } from "@/lib/txline/useLiveScore";
import { TxLineBadge } from "@/components/ui/TxLineBadge";

export function LiveScoreBanner({
  fixtureId,
  homeTeam,
  awayTeam,
  homeCrest,
  awayCrest,
  initialHomeScore,
  initialAwayScore,
  isLive,
}: {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string;
  awayCrest?: string;
  initialHomeScore?: number;
  initialAwayScore?: number;
  isLive: boolean;
}) {
  const {
    homeScore,
    awayScore,
    score,
    connected,
    refresh,
  } = useLiveScore(fixtureId, {
    homeScore: initialHomeScore ?? 0,
    awayScore: initialAwayScore ?? 0,
  });
  const hasScore = homeScore != null && awayScore != null;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          {homeCrest ? (
            <img
              src={homeCrest}
              alt={homeTeam}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-zinc-400">{homeTeam.charAt(0)}</span>
          )}
        </div>
        <span className="text-sm font-medium text-zinc-200">{homeTeam}</span>
        {homeScore != null ? (
          <span className="text-4xl font-bold tracking-tight">{homeScore}</span>
        ) : (
          <div className="h-9 w-12 animate-pulse rounded bg-white/5" />
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-6">
        {hasScore || isLive ? (
          <>
            {connected && <TxLineBadge status="active" />}
            {score?.period && (
              <span className="text-xs font-mono text-zinc-600">{score.period}</span>
            )}
            {score && (
              <span className="text-[10px] text-zinc-600">seq {score.seq}</span>
            )}
          </>
        ) : hasScore ? (
          <span className="text-sm text-zinc-600">vs</span>
        ) : (
          <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
        )}
        <button
          onClick={refresh}
          className="mt-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Refresh score"
        >
          &#x21bb;
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          {awayCrest ? (
            <img
              src={awayCrest}
              alt={awayTeam}
              className="h-10 w-10 object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-zinc-400">{awayTeam.charAt(0)}</span>
          )}
        </div>
        <span className="text-sm font-medium text-zinc-200">{awayTeam}</span>
        {awayScore != null ? (
          <span className="text-4xl font-bold tracking-tight">{awayScore}</span>
        ) : (
          <div className="h-9 w-12 animate-pulse rounded bg-white/5" />
        )}
      </div>
    </div>
  );
}
