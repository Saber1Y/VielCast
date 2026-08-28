"use client";

import { useCallback, useState } from "react";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { MarketAPI, type MarketProviders } from "../../../contracts/src/market-api";
import {
  positionCommitment,
  type PrivatePosition,
} from "../../../contracts/src/witnesses";
import { connectMidnightWallet, initializeMidnightProviders } from "./browser-provider";

export type MidnightWalletStatus = "disconnected" | "connecting" | "connected" | "error";
export type MarketOutcome = 1 | 2;

export function useMidnightMarket() {
  const [status, setStatus] = useState<MidnightWalletStatus>("disconnected");
  const [providers, setProviders] = useState<MarketProviders | null>(null);
  const [market, setMarket] = useState<MarketAPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const wallet = await connectMidnightWallet();
      const configuredProviders = await initializeMidnightProviders(wallet);
      setProviders(configuredProviders);
      const addresses = await wallet.getShieldedAddresses();
      setWalletAddress(addresses.shieldedCoinPublicKey);
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
      const deployed = await MarketAPI.deploy(
        providers,
        input.marketId,
        input.deadline,
        input.resolver,
        input.position,
        input.resolverSecret,
      );
      setMarket(deployed);
      await deployed.submitPosition(positionCommitment(input.position));
      return deployed;
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
      const joined = await MarketAPI.join(
        providers,
        input.contractAddress,
        input.position,
        input.resolverSecret,
      );
      setMarket(joined);
      await joined.submitPosition(positionCommitment(input.position));
      return joined;
    },
    [providers],
  );

  const joinByAddress = useCallback(
    async (contractAddress: ContractAddress, position: PrivatePosition, resolverSecret: Uint8Array) =>
      joinMarket({ contractAddress, position, resolverSecret }),
    [joinMarket],
  );

  const operateMarket = useCallback(
    async (operation: (api: MarketAPI) => Promise<void>) => {
      if (!market) throw new Error("Deploy or join a market first");
      await operation(market);
    },
    [market],
  );

  const lockMarket = useCallback(
    () => operateMarket((api) => api.lockMarket()),
    [operateMarket],
  );

  const resolveMarket = useCallback(
    (outcome: MarketOutcome, resultHash: Uint8Array) =>
      operateMarket((api) => api.resolveMarket(outcome, resultHash)),
    [operateMarket],
  );

  const claim = useCallback(
    (nullifier: Uint8Array, position: PrivatePosition) =>
      operateMarket((api) => api.claim(positionCommitment(position), nullifier)),
    [operateMarket],
  );

  return {
    status,
    error,
    connected: status === "connected",
    contractAddress: market?.contractAddress ?? null,
    walletAddress,
    connect,
    deployMarket,
    joinMarket,
    joinByAddress,
    lockMarket,
    resolveMarket,
    claim,
  };
}