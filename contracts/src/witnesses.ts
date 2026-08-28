export type PrivatePosition = {
  readonly side: boolean;
  readonly stake: bigint;
  readonly salt: Uint8Array;
};

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
