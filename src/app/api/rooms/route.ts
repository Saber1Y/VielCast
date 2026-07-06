import { NextRequest, NextResponse } from "next/server";
import { createRoom, listRooms } from "@/lib/rooms/store";
import { getServerSDK } from "@/lib/solana/server";
import { Connection } from "@solana/web3.js";
import { DEVNET_RPC } from "@/lib/solana/constants";
import { getFixtureById } from "@/lib/txline/client";
import { ensureTxLINEInit } from "@/lib/txline/server-init";
import { canCreateRoom } from "@/lib/txline/status";

export async function GET() {
  const rooms = await listRooms();
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fixtureId, homeTeam, awayTeam, marketType, threshold, entryFee, wallet } = body;
    if (!fixtureId || !homeTeam || !awayTeam || !marketType || threshold === undefined || !entryFee || !wallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the match is upcoming
    ensureTxLINEInit();
    const fixture = await getFixtureById(Number(fixtureId));
    if (!fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }
    if (!canCreateRoom(fixture.startDate)) {
      const status = fixture.status;
      return NextResponse.json({
        error: status === "finished"
          ? `Cannot create a room for ${homeTeam} vs ${awayTeam} — this match has already ended. Rooms can only be created before kickoff.`
          : `Cannot create a room for ${homeTeam} vs ${awayTeam} — this match is already in progress. Rooms can only be created before kickoff.`,
      }, { status: 400 });
    }

    const sdk = getServerSDK();
    const [marketPda] = sdk.marketPda(fixtureId);

    // Check if market PDA already exists on-chain — reconstruct room from on-chain data
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const accountInfo = await connection.getAccountInfo(marketPda);
    if (accountInfo) {
      const onChain = await sdk.fetchMarket(fixtureId);
      const onChainFixture = Number(onChain.fixtureId);
      if (onChainFixture !== fixtureId) {
        return NextResponse.json({ error: "On-chain fixture ID mismatch" }, { status: 409 });
      }
      const onChainMarketType = Object.keys(onChain.marketType)[0] || marketType;
      const onChainThreshold = Number(onChain.threshold);
      const statusMap: Record<string, string> = {
        open: "OPEN",
        locked: "LOCKED",
        resolved: "CLAIMABLE",
      };
      const reconstructedStatus: string = statusMap[Object.keys(onChain.status)[0]?.toLowerCase()] ?? "OPEN";
      const room = await createRoom({
        fixtureId, homeTeam, awayTeam,
        marketType: onChainMarketType,
        threshold: onChainThreshold,
        entryFee: entryFee,
        wallet,
        marketPda: marketPda.toBase58(),
        overrideStatus: reconstructedStatus as any,
      });
      if (onChain.winnerSide) {
        const winSide = Object.keys(onChain.winnerSide)[0];
        room.winnerSide = winSide as any;
      }
      return NextResponse.json(room, { status: 201 });
    }

    const txSig = await sdk.initializeMarket(fixtureId, marketType, threshold);

    const room = await createRoom({
      fixtureId, homeTeam, awayTeam, marketType, threshold, entryFee, wallet,
      marketPda: marketPda.toBase58(),
      initializeTx: txSig,
    });
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";

    // Catch the common "already in use" simulation error and return a friendly message
    if (msg.includes("custom program error: 0x0") || msg.includes("already in use")) {
      return NextResponse.json({
        error: "A market for this fixture already exists on-chain. Each fixture can only have one room. Please pick a different fixture from the list.",
      }, { status: 409 });
    }

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
