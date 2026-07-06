import { NextRequest, NextResponse } from "next/server";
import { getRoom, markClaimed } from "@/lib/rooms/store";
import { getServerSDK } from "@/lib/solana/server";
import { PublicKey } from "@solana/web3.js";

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
    const { wallet, txSig } = body;
    if (!wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // Phase 2: Confirm the claim with a txSig
    if (txSig) {
      const updated = await markClaimed(id, wallet);
      if (!updated) {
        return NextResponse.json({
          error: "Claim failed — you may not be a winner or already claimed",
        }, { status: 400 });
      }
      return NextResponse.json(updated);
    }

    // Phase 1: Build and return unsigned claim transaction
    const sdk = getServerSDK();
    const tx = await sdk.buildClaimTransaction(
      room.fixtureId,
      new PublicKey(wallet),
    );

    return NextResponse.json({
      tx: Buffer.from(tx.serialize({ verifySignatures: false })).toString("base64"),
    });
  } catch (err) {
    console.error("[claim/route] error:", err);
    if (err instanceof Error) {
      console.error("[claim/route] message:", err.message);
      console.error("[claim/route] stack:", err.stack);
    }
    const msg = err instanceof Error ? err.message : "Claim failed";
    return NextResponse.json({ error: msg, details: err instanceof Error ? err.message : "unknown" }, { status: 500 });
  }
}
