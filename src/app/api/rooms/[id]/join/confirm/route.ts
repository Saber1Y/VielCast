import { NextRequest, NextResponse } from "next/server";
import { getRoom, addConfirmedParticipant } from "@/lib/rooms/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { wallet, side, amount, txSig } = body;
    if (!wallet || !side || !amount || !txSig) {
      return NextResponse.json({ error: "wallet, side, amount, and txSig required" }, { status: 400 });
    }

    const result = await addConfirmedParticipant(id, { wallet, side, amount, joinTx: txSig });
    if (!result) {
      return NextResponse.json({ error: "Room is no longer open" }, { status: 400 });
    }
    if (result.duplicate) {
      return NextResponse.json({ error: "You have already joined this room" }, { status: 400 });
    }

    return NextResponse.json(result.room);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
