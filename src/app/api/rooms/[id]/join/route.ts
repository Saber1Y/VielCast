import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms/store";
import { getSportsDataProvider } from "@/lib/sports-data/provider";
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
  const fixture = await getSportsDataProvider().getFixtureById(room.fixtureId);
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

    if (room.midnightContract) {
      // Midnight room: joining happens client-side (Lace submits the hashed position commitment).
      // Return the contract address so the client can join on-chain.
      return NextResponse.json({
        midnight: true,
        contractAddress: room.midnightContract,
        totalStake: room.entryFee * amount,
      });
    }

    // Legacy Solana room path
    const { PublicKey } = await import("@solana/web3.js");
    const { getServerSDK } = await import("@/lib/solana/server");
    const totalStake = room.entryFee * amount;
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