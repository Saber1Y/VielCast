import { NextRequest, NextResponse } from "next/server";
import { getRoom, markClaimed } from "@/lib/rooms/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "CLAIMABLE") {
    return NextResponse.json({ error: "Room is not in a claimable state" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { wallet } = body;
    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // The winner proves their position on-chain through Lace (commitment + nullifier reveal).
    // Here we only record the claim.
    const updated = await markClaimed(id, wallet);
    if (!updated) {
      return NextResponse.json({
        error: "Claim failed — you may not be a winner or already claimed",
      }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[claim/route] error:", err);
    const msg = err instanceof Error ? err.message : "Claim failed";
    return NextResponse.json({ error: msg, details: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}