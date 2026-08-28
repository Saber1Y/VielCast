"use client";

import type { ContractAddress, SigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  ExportPrivateStatesOptions,
  ExportSigningKeysOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
  PrivateStateExport,
  PrivateStateId,
  PrivateStateProvider,
  SigningKeyExport,
} from "@midnight-ntwrk/midnight-js-types";

export function createPrivateStateProvider<PSI extends PrivateStateId, PS>(): PrivateStateProvider<PSI, PS> {
  const privateStates = new Map<ContractAddress, Map<PSI, PS>>();
  const signingKeys = new Map<ContractAddress, SigningKey>();
  let contractAddress: ContractAddress | null = null;

  const requireAddress = (): ContractAddress => {
    if (!contractAddress) throw new Error("Midnight contract address is not set");
    return contractAddress;
  };

  const statesFor = (address: ContractAddress): Map<PSI, PS> => {
    let states = privateStates.get(address);
    if (!states) {
      states = new Map();
      privateStates.set(address, states);
    }
    return states;
  };

  const encode = (value: unknown): string => JSON.stringify(value);
  const decode = <T>(value: string): T => JSON.parse(value) as T;

  return {
    setContractAddress(address) {
      contractAddress = address;
    },
    set(key, state) {
      statesFor(requireAddress()).set(key, state);
      return Promise.resolve();
    },
    get(key) {
      return Promise.resolve(statesFor(requireAddress()).get(key) ?? null);
    },
    remove(key) {
      statesFor(requireAddress()).delete(key);
      return Promise.resolve();
    },
    clear() {
      privateStates.delete(requireAddress());
      return Promise.resolve();
    },
    setSigningKey(address, key) {
      signingKeys.set(address, key);
      return Promise.resolve();
    },
    getSigningKey(address) {
      return Promise.resolve(signingKeys.get(address) ?? null);
    },
    removeSigningKey(address) {
      signingKeys.delete(address);
      return Promise.resolve();
    },
    clearSigningKeys() {
      signingKeys.clear();
      return Promise.resolve();
    },
    exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      const address = requireAddress();
      const states = Object.fromEntries(
        Array.from(statesFor(address).entries()).map(([key, value]) => [key, encode(value)]),
      );
      return Promise.resolve({
        format: "midnight-private-state-export",
        encryptedPayload: encode({ contractAddress: address, states }),
        salt: "veilcast-browser",
      });
    },
    importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const states = statesFor(requireAddress());
      const payload = decode<{ states?: Record<string, string> }>(exportData.encryptedPayload);
      const strategy = options?.conflictStrategy ?? "error";
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [rawKey, serialized] of Object.entries(payload.states ?? {})) {
        const key = rawKey as PSI;
        if (states.has(key)) {
          if (strategy === "skip") {
            skipped++;
            continue;
          }
          if (strategy === "error") return Promise.reject(new Error(`Private state conflict: ${key}`));
          overwritten++;
        } else {
          imported++;
        }
        states.set(key, decode<PS>(serialized));
      }

      return Promise.resolve({ imported, skipped, overwritten });
    },
    exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.resolve({
        format: "midnight-signing-key-export",
        encryptedPayload: encode({ keys: Object.fromEntries(signingKeys.entries()) }),
        salt: "veilcast-browser",
      });
    },
    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const payload = decode<{ keys?: Record<string, SigningKey> }>(exportData.encryptedPayload);
      const strategy = options?.conflictStrategy ?? "error";
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;

      for (const [address, key] of Object.entries(payload.keys ?? {})) {
        if (signingKeys.has(address)) {
          if (strategy === "skip") {
            skipped++;
            continue;
          }
          if (strategy === "error") return Promise.reject(new Error(`Signing key conflict: ${address}`));
          overwritten++;
        } else {
          imported++;
        }
        signingKeys.set(address, key);
      }

      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
}
