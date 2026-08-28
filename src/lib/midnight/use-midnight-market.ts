"use client";

import { useCallback, useState } from "react";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { MarketAPI, type MarketProviders } from "../../../contracts/src/market-api";
import type { PrivatePosition } from "../../../contracts/src/witnesses";
import { connectMidnightWallet, initializeMidnightProviders } from "./browser-provider";

export type MidnightWalletStatus = "disconnected" | "connecting" | "connected" | "error";

export function useMidnightMarket() {
  const [status, setStatus] = useState<MidnightWalletStatus>("disconnected");
  const [providers, setProviders] = useState<MarketProviders | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const wallet = await connectMidnightWallet();
      const configuredProviders = await initializeMidnightProviders(wallet);
      setProviders(configuredProviders);
      setStatus("connected");
      return wallet;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Midnight wallet connection failed";
      setError(message);
      setStatus("error");
      throw new Error(message);
    }
  }, []);

  const deployMarket = useCallback(
    async (input: {
      marketId: Uint8Array;
      deadline: bigint;
      resolver: Uint8Array;
      position: PrivatePosition;
      resolverSecret: Uint8Array;
    }) => {
      if (!providers) throw new Error("Connect a Midnight wallet first");
      return MarketAPI.deploy(providers, input.marketId, input.deadline, input.resolver, input.position, input.resolverSecret);
    },
    [providers],
  );

  const joinMarket = useCallback(
    async (input: {
      contractAddress: ContractAddress;
      position: PrivatePosition;
      resolverSecret: Uint8Array;
    }) => {
      if (!providers) throw new Error("Connect a Midnight wallet first");
      return MarketAPI.join(providers, input.contractAddress, input.position, input.resolverSecret);
    },
    [providers],
  );

  return { status, error, connected: status === "connected", connect, deployMarket, joinMarket };
}
