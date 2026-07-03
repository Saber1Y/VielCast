import { NextRequest, NextResponse } from "next/server";
import { getRoom, markClaimed } from "@/lib/rooms/store";
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { DEVNET_RPC } from "@/lib/solana/constants";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = getRoom(id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "CLAIMABLE") {
    return NextResponse.json({ error: "Room is not in a claimable state" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { wallet: walletStr } = body;
    if (!walletStr) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    // Find the participant to verify they're a winner
    const participant = room.participants.find(
      (p) => p.wallet === walletStr && p.side === room.winnerSide
    );
    if (!participant) {
      return NextResponse.json({ error: "You are not a winner" }, { status: 400 });
    }

    const payoutLamports = participant.amount * room.entryFee * 2;
    const claimerWallet = new PublicKey(walletStr);

    // Send payout from admin keypair
    const keypairPath = process.env.ADMIN_KEYPAIR_PATH
      ? path.resolve(process.env.ADMIN_KEYPAIR_PATH)
      : path.resolve("solana/admin-keypair.json");
    const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const adminKeypair = Keypair.fromSecretKey(Buffer.from(secret));

    const connection = new Connection(DEVNET_RPC, "confirmed");
    const { blockhash } = await connection.getLatestBlockhash();

    const transferIx = SystemProgram.transfer({
      fromPubkey: adminKeypair.publicKey,
      toPubkey: claimerWallet,
      lamports: payoutLamports,
    });

    const payoutTx = new Transaction().add(transferIx);
    payoutTx.recentBlockhash = blockhash;
    payoutTx.feePayer = adminKeypair.publicKey;
    payoutTx.sign(adminKeypair);

    const txSig = await connection.sendRawTransaction(payoutTx.serialize());
    await connection.confirmTransaction(txSig, "confirmed");
    console.log("[claim/submit] payout sent:", txSig, payoutLamports / 1e9, "SOL");

    // Mark claimed off-chain
    const updated = markClaimed(id, walletStr);
    if (!updated) {
      return NextResponse.json({
        error: "Claim failed — you may not be a winner or already claimed",
      }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[claim/submit] error:", err);
    const msg = err instanceof Error ? err.message : "Claim submission failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
