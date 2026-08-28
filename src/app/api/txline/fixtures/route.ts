import { NextRequest, NextResponse } from "next/server";
import { getSportsDataProvider } from "@/lib/sports-data/provider";

export async function GET(req: NextRequest) {
  try {
    const competitionId = req.nextUrl.searchParams.get("competitionId");
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const fixtures = await getSportsDataProvider().getFixtures(
      from,
      to,
      competitionId ? Number(competitionId) : undefined,
    );

    return NextResponse.json(fixtures);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch fixtures";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
