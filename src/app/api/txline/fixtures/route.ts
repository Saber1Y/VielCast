import { NextRequest, NextResponse } from "next/server";
import { ensureTxLINEInit } from "@/lib/txline/server-init";
import { getFixtures, getScoreSnapshot } from "@/lib/txline/client";
import { getMatchStatus, type MatchStatus } from "@/lib/txline/status";

export async function GET(req: NextRequest) {
  try {
    ensureTxLINEInit();
    const competitionId = req.nextUrl.searchParams.get("competitionId");
    const fixtures = await getFixtures(competitionId ? Number(competitionId) : undefined);

    // Fetch live scores for matches that might be in progress or recently finished
    const now = Date.now();
    const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;
    const scorePromises = fixtures
      .filter((f) => {
        const start = new Date(f.startDate).getTime();
        const elapsed = now - start;
        return elapsed >= 0 && elapsed < LIVE_WINDOW_MS;
      })
      .map(async (f) => {
        try {
          const snapshot = await getScoreSnapshot(f.id);
          return { fixtureId: f.id, snapshot };
        } catch {
          return { fixtureId: f.id, snapshot: null };
        }
      });

    const scoreResults = await Promise.all(scorePromises);
    const scoreMap = new Map(scoreResults.map((r) => [r.fixtureId, r.snapshot]));

    const enriched = fixtures.map((f) => {
      const snapshot = scoreMap.get(f.id);
      const scoreStatus = snapshot?.status;
      const matchStatus = getMatchStatus(f.startDate, scoreStatus) as MatchStatus;

      return {
        ...f,
        status: matchStatus,
        homeScore: snapshot?.home_score ?? undefined,
        awayScore: snapshot?.away_score ?? undefined,
        minute: snapshot?.period ?? undefined,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch fixtures";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
