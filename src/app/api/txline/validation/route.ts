import { NextRequest, NextResponse } from "next/server";
import { getSportsDataProvider } from "@/lib/sports-data/provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fixtureId, seq, statKey, statKey2, operator } = body;
    if (!fixtureId || seq === undefined || !statKey) {
      return NextResponse.json(
        { error: "fixtureId, seq, and statKey are required" },
        { status: 400 }
      );
    }
    const fixture = await getSportsDataProvider().getFinalResult(Number(fixtureId));
    if (!fixture) {
      return NextResponse.json({ error: "Final result is not available" }, { status: 409 });
    }

    return NextResponse.json({
      fixture_id: fixture.id,
      seq: fixture.id,
      stat_key: statKey,
      stat_key2: statKey2,
      operator,
      result: true,
      source: fixture.provider,
      source_timestamp: fixture.startDate,
      proof: null,
      merkle_root: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
