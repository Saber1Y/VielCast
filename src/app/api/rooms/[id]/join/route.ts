import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getRoom } from "@/lib/rooms/store";
import { getServerSDK } from "@/lib/solana/server";
import { getFixtureById } from "@/lib/txline/client";
import { ensureTxLINEInit } from "@/lib/txline/server-init";
import { canJoinRoom } from "@/lib/txline/status";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "OPEN") {
    return NextResponse.json({ error: "Room is not open" }, { status: 400 });
  }

  // Verify the match is still joinable (upcoming only for MVP)
  ensureTxLINEInit();
  const fixture = await getFixtureById(room.fixtureId);
  if (!fixture || !canJoinRoom(fixture.startDate)) {
    return NextResponse.json({
      error: "This match has already started. Joining is only allowed before kickoff.",
    }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { wallet, side, amount } = body;
    if (!wallet || !side || !amount) {
      return NextResponse.json({ error: "wallet, side, and amount required" }, { status: 400 });
    }

    // Check for duplicate wallet
    const existing = room.participants.find(
      (p) => p.wallet.toLowerCase() === wallet.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ error: "You have already joined this room" }, { status: 400 });
    }

    // Compute total stake = entryFee * number of entries
    const totalStake = room.entryFee * amount;

    // Build unsigned transaction for the user to sign
    const sdk = getServerSDK();
    const tx = await sdk.buildJoinTransaction(
      room.fixtureId,
      new PublicKey(wallet),
      side,
      totalStake,
    );

    return NextResponse.json({
      tx: Buffer.from(tx.serialize({ verifySignatures: false })).toString("base64"),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
