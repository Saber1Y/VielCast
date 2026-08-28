import {
  CompactTypeBoolean,
  CompactTypeBytes,
  CompactTypeUnsignedInteger,
  persistentCommit,
  persistentHash,
  type CompactType,
} from "@midnight-ntwrk/compact-runtime";

export type PrivatePosition = {
  readonly side: boolean;
  readonly stake: bigint;
  readonly salt: Uint8Array;
};

const compactTypeUint64 = new CompactTypeUnsignedInteger(18446744073709551615n, 8);
const compactTypeBytes32 = new CompactTypeBytes(32);

class CompactTypePosition implements CompactType<[boolean, bigint, Uint8Array]> {
  alignment() {
    return CompactTypeBoolean.alignment().concat(
      compactTypeUint64.alignment().concat(compactTypeBytes32.alignment()),
    );
  }
  fromValue(value: import("@midnight-ntwrk/compact-runtime").Value): [boolean, bigint, Uint8Array] {
    return [
      CompactTypeBoolean.fromValue(value),
      compactTypeUint64.fromValue(value),
      compactTypeBytes32.fromValue(value),
    ];
  }
  toValue(value: [boolean, bigint, Uint8Array]): import("@midnight-ntwrk/compact-runtime").Value {
    return CompactTypeBoolean.toValue(value[0]).concat(
      compactTypeUint64.toValue(value[1]).concat(compactTypeBytes32.toValue(value[2])),
    );
  }
}

const compactTypePosition = new CompactTypePosition();

export const positionCommitment = (position: PrivatePosition): Uint8Array =>
  persistentCommit(compactTypePosition, [position.side, position.stake, position.salt], position.salt);

export const resolverCommitment = (resolverSecret: Uint8Array): Uint8Array =>
  persistentHash(compactTypeBytes32, resolverSecret);

export type MarketPrivateState = {
  readonly position: PrivatePosition;
  readonly resolverSecret: Uint8Array;
};

export const createMarketPrivateState = (
  position: PrivatePosition,
  resolverSecret: Uint8Array,
): MarketPrivateState => ({ position, resolverSecret });

export const createWitnesses = () => ({
  privatePosition: ({
    privateState,
  }: {
    privateState: MarketPrivateState;
  }): [MarketPrivateState, [boolean, bigint, Uint8Array]] => [
    privateState,
    [privateState.position.side, privateState.position.stake, privateState.position.salt],
  ],
  resolverSecret: ({
    privateState,
  }: {
    privateState: MarketPrivateState;
  }): [MarketPrivateState, Uint8Array] => [privateState, privateState.resolverSecret],
});
