"use client";

import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId, type NetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { firstValueFrom, interval, throwError } from "rxjs";
import { catchError, concatMap, filter, map, take, timeout } from "rxjs/operators";
import { pipe } from "fp-ts/function";
import semver from "semver";
import type { MarketCircuitKeys, MarketProviders } from "../../../contracts/src/market-api";
import type { MarketPrivateState } from "../../../contracts/src/witnesses";
import { createPrivateStateProvider } from "./private-state-provider";

export const DEFAULT_NETWORK_ID: NetworkId = "preprod" as NetworkId;

function findWallet(): InitialAPI | undefined {
  const midnight = (window as Window & { midnight?: Record<string, unknown> }).midnight;
  if (!midnight) return undefined;

  return Object.values(midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === "object" &&
      "apiVersion" in wallet &&
      typeof wallet.apiVersion === "string" &&
      semver.satisfies(wallet.apiVersion, "4.x"),
  );
}

export async function connectMidnightWallet(networkId: NetworkId = DEFAULT_NETWORK_ID): Promise<ConnectedAPI> {
  const initialAPI = await firstValueFrom(
    pipe(
      interval(100),
      map(() => findWallet()),
      filter((wallet): wallet is InitialAPI => !!wallet),
      take(1),
      timeout({ first: 3_000, with: () => throwError(() => new Error("Could not find a compatible Lace wallet.")) }),
      concatMap((wallet) => wallet.connect(networkId)),
      timeout({ first: 5_000, with: () => throwError(() => new Error("Lace wallet failed to respond.")) }),
      catchError((error) =>
        throwError(() => (error instanceof Error ? error : new Error("Midnight wallet authorization failed."))),
      ),
    ),
  );

  return initialAPI;
}

export async function initializeMidnightProviders(
  wallet: ConnectedAPI,
  networkId: NetworkId = DEFAULT_NETWORK_ID,
): Promise<MarketProviders> {
  setNetworkId(networkId);
  const configuration = await wallet.getConfiguration();
  if (!configuration.proverServerUri) throw new Error("Lace did not provide a Midnight proof server URL.");
  if (!configuration.indexerUri || !configuration.indexerWsUri) {
    throw new Error("Lace did not provide Midnight indexer URLs.");
  }

  const shieldedAddresses = await wallet.getShieldedAddresses();
  const privateStateProvider = createPrivateStateProvider<"veilcastMarketPrivateState", MarketPrivateState>();
  const zkConfigProvider = new FetchZkConfigProvider<MarketCircuitKeys>(window.location.origin, fetch.bind(window));

  return {
    privateStateProvider,
    zkConfigProvider,
    proofProvider: httpClientProofProvider(configuration.proverServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (transaction: UnboundTransaction): Promise<FinalizedTransaction> => {
        const balanced = await wallet.balanceUnsealedTransaction(toHex(transaction.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          "signature",
          "proof",
          "binding",
          fromHex(balanced.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (transaction: FinalizedTransaction): Promise<TransactionId> => {
        await wallet.submitTransaction(toHex(transaction.serialize()));
        return transaction.identifiers()[0];
      },
    },
  };
}
