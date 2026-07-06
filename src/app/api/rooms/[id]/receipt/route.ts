import { NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "SETTLED" && room.status !== "CLAIMABLE") {
    return NextResponse.json({ error: "Room not yet settled" }, { status: 400 });
  }
  if (!room.settlementReceipt) {
    return NextResponse.json({ error: "No settlement receipt found" }, { status: 400 });
  }
  return NextResponse.json({
    ...room.settlementReceipt,
    entryFee: room.entryFee,
    homeTeam: room.homeTeam,
    awayTeam: room.awayTeam,
    participants: room.participants.map((p) => ({
      id: p.id,
      wallet: p.wallet,
      side: p.side,
      amount: p.amount,
      claimed: p.claimed,
    })),
    status: room.status,
  });
}
