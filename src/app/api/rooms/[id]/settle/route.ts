import { NextRequest, NextResponse } from "next/server";
import { getRoom, setAwaitingProof, settleRoom } from "@/lib/rooms/store";
import { getSportsDataProvider } from "@/lib/sports-data/provider";
import { getServerSDK } from "@/lib/solana/server";
import type { Side, SettlementReceipt } from "@/lib/rooms/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "LOCKED" && room.status !== "AWAITING_PROOF") {
    return NextResponse.json({ error: "Room must be LOCKED before settling" }, { status: 400 });
  }

  // Only the creator can settle
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const wallet = body.wallet as string | undefined;
  if (!wallet || wallet.toLowerCase() !== room.createdBy.toLowerCase()) {
    return NextResponse.json({ error: "Only the room creator can settle" }, { status: 403 });
  }
  const winnerOverride = body.winnerOverride as Side | undefined;

  try {
    if (room.status === "LOCKED") {
      await setAwaitingProof(id);
    }

    const fixture = await getSportsDataProvider().getFinalResult(room.fixtureId);
    if (!fixture || fixture.homeScore === undefined || fixture.awayScore === undefined) {
      return NextResponse.json({ error: "No final score available from Sportmonks" }, { status: 500 });
    }

    const homeScore = fixture.homeScore;
    const awayScore = fixture.awayScore;
    const total = homeScore + awayScore;

    let winnerSide: Side;
    const isOverUnder = room.marketType.toUpperCase().replace(/_/g, "") === "TOTALGOALSOVERUNDER";
    if (isOverUnder) {
      winnerSide = total > room.threshold ? "OVER" : "UNDER";
    } else {
      if (homeScore > awayScore) winnerSide = "HOME";
      else if (awayScore > homeScore) winnerSide = "AWAY";
      else if (winnerOverride) winnerSide = winnerOverride;
      else winnerSide = "DRAW";
    }

    const sdk = getServerSDK();
    const dummyMerkleRoot = new Array(32).fill(0);
    const settleTx = await sdk.settleMarket(room.fixtureId, winnerSide, dummyMerkleRoot);

    const receipt: SettlementReceipt = {
      fixtureId: room.fixtureId,
      roomId: room.id,
      marketType: room.marketType,
      threshold: room.threshold,
      finalScore: { home: homeScore, away: awayScore },
      txlineSeq: fixture.id,
      winnerSide,
      payoutSummary: room.participants
        .filter((p) => p.side === winnerSide)
        .map((p) => ({ participant: p.wallet, amount: p.amount * room.entryFee * 2 })),
    };

    const settled = await settleRoom(id, winnerSide, receipt, settleTx);
    if (!settled) {
      return NextResponse.json({ error: "Failed to settle room" }, { status: 500 });
    }

    return NextResponse.json(settled);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Settlement failed";
    return NextResponse.json({ error: msg, awaitingProof: true }, { status: 500 });
  }
}
