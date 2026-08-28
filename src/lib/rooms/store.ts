import type { Room, SettlementReceipt, Side, ActivityLogEntry } from "./types";
import fs from "fs";
import path from "path";

const STORE_PATH = path.resolve(process.cwd(), ".rooms.json");
const useKv = !!process.env.KV_URL;

function loadFile(): Map<string, Room> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const arr: Room[] = JSON.parse(raw);
      return new Map(arr.map((r) => [r.id, r]));
    }
  } catch {
    // corrupted file — start fresh
  }
  return new Map();
}

function saveFile(rooms: Map<string, Room>): void {
  try {
    const arr = Array.from(rooms.values());
    fs.writeFileSync(STORE_PATH, JSON.stringify(arr, null, 2), "utf-8");
  } catch {
    // silently fail — read-only filesystem
  }
}

// Cache used by both KV and file modes
const rooms = new Map<string, Room>();
let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;

  if (useKv) {
    // Load all rooms from Vercel KV
    try {
      const { kv } = await import("@vercel/kv");
      const keys = await kv.keys("room:*");
      for (const key of keys) {
        const room = await kv.get<Room>(key);
        if (room) rooms.set(room.id, room);
      }
    } catch {
      console.warn("[store] KV unavailable, falling back to file");
      const fileRooms = loadFile();
      for (const [id, r] of fileRooms) rooms.set(id, r);
    }
  } else {
    const fileRooms = loadFile();
    for (const [id, r] of fileRooms) rooms.set(id, r);
  }
}

async function persist(room: Room): Promise<void> {
  if (useKv) {
    try {
      const { kv } = await import("@vercel/kv");
      await kv.set(`room:${room.id}`, room);
    } catch {
      saveFile(rooms);
    }
  } else {
    saveFile(rooms);
  }
}

async function persistAll(): Promise<void> {
  if (useKv) {
    try {
      const { kv } = await import("@vercel/kv");
      const pipeline = kv.pipeline();
      for (const [id, room] of rooms) {
        pipeline.set(`room:${id}`, room);
      }
      await pipeline.exec();
    } catch {
      saveFile(rooms);
    }
  } else {
    saveFile(rooms);
  }
}

function nextNum(): number {
  let max = 0;
  for (const id of rooms.keys()) {
    const m = id.match(/^room_(\d+)_/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function generateId(): string {
  return `room_${nextNum()}_${Date.now()}`;
}

let logCounter = Date.now();

function generateLogId(): string {
  return `log_${++logCounter}`;
}

function addActivityLog(
  room: Room,
  entry: Omit<ActivityLogEntry, "id" | "timestamp">
): void {
  room.activityLog.push({
    id: generateLogId(),
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function createRoom(data: {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  marketType: string;
  threshold: number;
  entryFee: number;
  wallet: string;
  marketPda?: string;
  initializeTx?: string;
  midnightContract?: string;
  resolverHash?: string;
  deployTx?: string;
  deadline?: number;
  overrideStatus?: Room["status"];
}): Promise<Room> {
  await init();
  const room: Room = {
    id: generateId(),
    fixtureId: data.fixtureId,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    marketType: data.marketType as Room["marketType"],
    threshold: data.threshold,
    entryFee: data.entryFee,
    status: data.overrideStatus ?? "OPEN",
    participants: [],
    createdBy: data.wallet,
    createdAt: new Date().toISOString(),
    activityLog: [],
    marketPda: data.marketPda,
    initializeTx: data.initializeTx,
    midnightContract: data.midnightContract,
    resolverHash: data.resolverHash,
    deployTx: data.deployTx,
    deadline: data.deadline,
  };
  addActivityLog(room, {
    type: "ROOM_CREATED",
    wallet: data.wallet,
    message: `Room created by ${data.wallet.slice(0, 6)}...`,
  });
  rooms.set(room.id, room);
  await persist(room);
  return room;
}

export async function getRoom(id: string): Promise<Room | undefined> {
  await init();
  return rooms.get(id);
}

export async function listRooms(): Promise<Room[]> {
  await init();
  return Array.from(rooms.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addParticipant(
  roomId: string,
  participant: { id: string; wallet: string; side: Side; amount: number }
): Promise<{ room: Room; duplicate: boolean } | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status !== "OPEN") return null;
  const duplicate = room.participants.some(
    (p) => p.wallet.toLowerCase() === participant.wallet.toLowerCase()
  );
  if (duplicate) return { room, duplicate: true };
  room.participants.push({ ...participant, claimed: false });
  addActivityLog(room, {
    type: "USER_JOINED",
    wallet: participant.wallet,
    message: `${participant.wallet.slice(0, 6)}... joined ${participant.side}`,
  });
  await persist(room);
  return { room, duplicate: false };
}

export async function getPendingJoin(
  roomId: string,
  participantId: string,
): Promise<{ wallet: string; side: Side; amount: number } | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room) return null;
  const p = room.participants.find((p) => p.id === participantId);
  if (!p) return null;
  return { wallet: p.wallet, side: p.side, amount: p.amount };
}

export async function confirmPendingJoin(
  roomId: string,
  participantId: string,
  txSig: string,
): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room) return null;
  const p = room.participants.find((p) => p.id === participantId);
  if (!p) return null;
  p.joinTx = txSig;
  await persist(room);
  return room;
}

export async function addConfirmedParticipant(
  roomId: string,
  participant: { wallet: string; side: Side; amount: number; joinTx: string }
): Promise<{ room: Room; duplicate: boolean } | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status !== "OPEN") return null;
  const duplicate = room.participants.some(
    (p) => p.wallet.toLowerCase() === participant.wallet.toLowerCase()
  );
  if (duplicate) return { room, duplicate: true };
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  room.participants.push({ id, ...participant, claimed: false });
  addActivityLog(room, {
    type: "USER_JOINED",
    wallet: participant.wallet,
    message: `${participant.wallet.slice(0, 6)}... joined ${participant.side}`,
  });
  await persist(room);
  return { room, duplicate: false };
}

export async function lockRoom(roomId: string, txSig?: string): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status !== "OPEN") return null;
  room.status = "LOCKED";
  if (txSig) room.lockTx = txSig;
  addActivityLog(room, {
    type: "ROOM_LOCKED",
    message: "Rooms locked — predictions are closed",
  });
  await persist(room);
  return room;
}

export async function setAwaitingProof(roomId: string): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status !== "LOCKED") return null;
  room.status = "AWAITING_PROOF";
  addActivityLog(room, {
    type: "PROOF_FETCHING",
    message: "Match ended. Fetching TxLINE validation proof...",
  });
  await persist(room);
  return room;
}

export async function settleRoom(
  roomId: string,
  winnerSide: Side,
  receipt: SettlementReceipt,
  settleTx?: string
): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || (room.status !== "LOCKED" && room.status !== "AWAITING_PROOF")) return null;
  room.status = "CLAIMABLE";
  room.winnerSide = winnerSide;
  room.settlementReceipt = receipt;
  if (settleTx) room.settleTx = settleTx;
  addActivityLog(room, {
    type: "ROOM_SETTLED",
    message: `Room settled — ${winnerSide} wins`,
  });
  await persist(room);
  return room;
}

export async function markClaimed(roomId: string, wallet: string): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status !== "CLAIMABLE") return null;
  const participant = room.participants.find(
    (p) => p.wallet.toLowerCase() === wallet.toLowerCase() && p.side === room.winnerSide
  );
  if (!participant || participant.claimed) return null;
  participant.claimed = true;
  addActivityLog(room, {
    type: "WINNER_CLAIMED",
    wallet,
    message: `${wallet.slice(0, 6)}... claimed reward`,
  });
  await persist(room);
  return room;
}

export async function cancelRoom(
  roomId: string,
  reason: string
): Promise<Room | null> {
  await init();
  const room = rooms.get(roomId);
  if (!room || room.status === "SETTLED" || room.status === "CLAIMABLE" || room.status === "CANCELLED") return null;
  room.status = "CANCELLED";
  room.cancelledAt = new Date().toISOString();
  room.cancelReason = reason;
  addActivityLog(room, {
    type: "ROOM_CANCELLED",
    message: `Room cancelled — ${reason}`,
  });
  await persist(room);
  return room;
}
