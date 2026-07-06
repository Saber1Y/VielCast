import { NextRequest, NextResponse } from "next/server";
import { getRoom, lockRoom } from "@/lib/rooms/store";
import { getServerSDK } from "@/lib/solana/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  try {
    const sdk = getServerSDK();
    const txSig = await sdk.lockMarket(room.fixtureId);

    const updated = await lockRoom(id, txSig);
    if (!updated) return NextResponse.json({ error: "Room cannot be locked (not OPEN)" }, { status: 400 });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lock failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
