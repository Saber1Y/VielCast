import { NextRequest, NextResponse } from "next/server";
import { getRoom, lockRoom } from "@/lib/rooms/store";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // The creator locks the market on-chain through Lace (lockMarket proof). This route just records it.
  const updated = await lockRoom(id, "midnight");
  if (!updated) return NextResponse.json({ error: "Room cannot be locked (not OPEN)" }, { status: 400 });

  return NextResponse.json(updated);
}