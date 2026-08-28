import { NextRequest } from "next/server";
import { getSportsDataProvider } from "@/lib/sports-data/provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get("fixtureId");

  if (!fixtureId || Number.isNaN(Number(fixtureId))) {
    return new Response("A valid fixtureId is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendScore = async () => {
        const fixture = await getSportsDataProvider().getFixtureById(Number(fixtureId));
        if (!fixture) return;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          fixture_id: fixture.id,
          seq: Date.now(),
          status: fixture.status === "live" ? "in_progress" : fixture.status,
          home_score: fixture.homeScore ?? 0,
          away_score: fixture.awayScore ?? 0,
          timestamp: new Date().toISOString(),
        })}\n\n`));
      };

      try {
        while (!req.signal.aborted) {
          await sendScore();
          await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
      } catch {
        if (!req.signal.aborted) controller.error();
      } finally {
        if (!req.signal.aborted) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
