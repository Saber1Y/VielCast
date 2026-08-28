import { NextResponse } from "next/server";
import { getSportsDataProvider } from "@/lib/sports-data/provider";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  try {
    const { fixtureId } = await params;
    const id = Number(fixtureId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid fixture ID" }, { status: 400 });
    }
    const fixture = await getSportsDataProvider().getFixtureById(id);
    const snapshot = fixture && (fixture.homeScore !== undefined || fixture.awayScore !== undefined)
      ? {
          fixture_id: fixture.id,
          seq: fixture.id,
          status: fixture.status,
          home_score: fixture.homeScore ?? 0,
          away_score: fixture.awayScore ?? 0,
        }
      : null;
    return NextResponse.json({ snapshot, updates: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch scores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
