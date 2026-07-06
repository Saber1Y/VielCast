import { NextRequest, NextResponse } from "next/server";
import { getRoom, cancelRoom } from "@/lib/rooms/store";

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
    const reason = body.reason ?? "Match was cancelled or postponed";
    const updated = await cancelRoom(id, reason);
    if (!updated) {
      return NextResponse.json({ error: "Room cannot be cancelled in its current state" }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cancel failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
