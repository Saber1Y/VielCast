export type MarketType = "TOTAL_GOALS_OVER_UNDER" | "MATCH_WINNER";

export type RoomStatus =
  | "OPEN"
  | "LOCKED"
  | "LIVE"
  | "AWAITING_PROOF"
  | "SETTLED"
  | "CLAIMABLE"
  | "CANCELLED";

export type Side = "OVER" | "UNDER" | "HOME" | "AWAY" | "DRAW";

export interface ActivityLogEntry {
  id: string;
  type:
    | "ROOM_CREATED"
    | "USER_JOINED"
    | "ROOM_LOCKED"
    | "MATCH_LIVE"
    | "MATCH_ENDED"
    | "PROOF_FETCHING"
    | "PROOF_RECEIVED"
    | "ROOM_SETTLED"
    | "WINNER_CLAIMED"
    | "ROOM_CANCELLED";
  wallet?: string;
  message: string;
  timestamp: string;
}

export interface Participant {
  id: string;
  wallet: string;
  side: Side;
  amount: number;
  claimed: boolean;
  joinTx?: string;
}

export interface SettlementReceipt {
  fixtureId: number;
  roomId: string;
  marketType: MarketType;
  threshold: number;
  finalScore: { home: number; away: number };
  txlineSeq: number;
  winnerSide: Side;
  payoutSummary: { participant: string; amount: number }[];
  settlementTx?: string;
}

export interface Room {
  id: string;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string;
  awayCrest?: string;
  marketType: MarketType;
  threshold: number;
  entryFee: number; // lamports per entry
  status: RoomStatus;
  participants: Participant[];
  createdBy: string;
  createdAt: string;
  winnerSide?: Side;
  settlementReceipt?: SettlementReceipt;
  activityLog: ActivityLogEntry[];
  marketPda?: string;
  initializeTx?: string;
  lockTx?: string;
  settleTx?: string;
  midnightContract?: string;
  resolverHash?: string;
  deployTx?: string;
  deadline?: number;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface CreateRoomRequest {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  marketType: MarketType;
  threshold: number;
  wallet: string;
  entryFee: number;
}

export interface JoinRoomRequest {
  wallet: string;
  side: Side;
  amount: number;
}
