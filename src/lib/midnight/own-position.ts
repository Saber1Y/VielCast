"use client";

import type { PrivatePosition } from "../../../contracts/src/witnesses";

const STORAGE_KEY = "veilcast:mynarket:positions";

type StoredPosition = {
  contractAddress: string;
  side: boolean;
  stake: string;
  salt: number[];
  resolverSecret: number[];
};

function readAll(): StoredPosition[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: StoredPosition[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // sessionStorage unavailable — position stays in-memory only
  }
}

export function saveOwnPosition(
  contractAddress: string,
  position: PrivatePosition,
  resolverSecret: Uint8Array,
): void {
  const next = readAll().filter((p) => p.contractAddress !== contractAddress);
  next.push({
    contractAddress,
    side: position.side,
    stake: position.stake.toString(),
    salt: Array.from(position.salt),
    resolverSecret: Array.from(resolverSecret),
  });
  writeAll(next);
}

export function loadOwnPosition(
  contractAddress: string,
): { position: PrivatePosition; resolverSecret: Uint8Array } | null {
  const entry = readAll().find((p) => p.contractAddress === contractAddress);
  if (!entry) return null;
  return {
    position: {
      side: entry.side,
      stake: BigInt(entry.stake),
      salt: new Uint8Array(entry.salt),
    },
    resolverSecret: new Uint8Array(entry.resolverSecret),
  };
}