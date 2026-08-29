import { NextRequest, NextResponse } from "next/server";
import { addConfirmedParticipant, createRoom, listRooms, getRoom } from "@/lib/rooms/store";
import { getSportsDataProvider } from "@/lib/sports-data/provider";
import { canCreateRoom } from "@/lib/txline/status";

export async function GET() {
  const rooms = await listRooms();
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fixtureId,
      homeTeam,
      awayTeam,
      homeCrest,
      awayCrest,
      marketType,
      threshold,
      entryFee,
      wallet,
      midnightContract,
      resolverHash,
      deployTx,
      deadline,
      creatorSide,
      creatorStake,
    } = body;
    if (
      !fixtureId || !homeTeam || !awayTeam || !marketType ||
      threshold === undefined || !entryFee || !wallet
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the match is upcoming
    const fixture = await getSportsDataProvider().getFixtureById(Number(fixtureId));
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

    // One active room per fixture (the deployed contract MarketId is derived from the fixture)
    const existing = await listRooms();
    const duplicate = existing.find(
      (r) =>
        r.fixtureId === Number(fixtureId) &&
        (r.status === "OPEN" || r.status === "LOCKED" || r.status === "LIVE" || r.status === "AWAITING_PROOF")
    );
    if (duplicate) {
      return NextResponse.json({
        error: "A room for this fixture already exists. Each fixture can only have one room. Please pick a different fixture from the list.",
      }, { status: 409 });
    }

    const room = await createRoom({
      fixtureId: Number(fixtureId),
      homeTeam,
      awayTeam,
      homeCrest,
      awayCrest,
      marketType,
      threshold: Number(threshold),
      entryFee: Number(entryFee),
      wallet,
      midnightContract,
      resolverHash,
      deployTx,
      deadline,
    });

    // The deployer committed their own position on-chain during deploy, so record them here too.
    if (midnightContract && creatorSide) {
      await addConfirmedParticipant(room.id, {
        wallet,
        side: creatorSide as any,
        amount: Number(creatorStake ?? 1),
        joinTx: "deploy",
      });
    }

    const created = await getRoom(room.id);
    return NextResponse.json(created ?? room, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
