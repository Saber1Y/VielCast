import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  privatePosition(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [boolean,
                                                                               bigint,
                                                                               Uint8Array]];
  resolverSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  submitPosition(context: __compactRuntime.CircuitContext<PS>,
                 commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  lockMarket(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resolveMarket(context: __compactRuntime.CircuitContext<PS>,
                outcome_arg_0: number,
                result_hash_arg_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        commitment_0: Uint8Array,
        nullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  submitPosition(context: __compactRuntime.CircuitContext<PS>,
                 commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  lockMarket(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resolveMarket(context: __compactRuntime.CircuitContext<PS>,
                outcome_arg_0: number,
                result_hash_arg_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        commitment_0: Uint8Array,
        nullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  submitPosition(context: __compactRuntime.CircuitContext<PS>,
                 commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  lockMarket(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resolveMarket(context: __compactRuntime.CircuitContext<PS>,
                outcome_arg_0: number,
                result_hash_arg_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        commitment_0: Uint8Array,
        nullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly market_id: Uint8Array;
  readonly deadline: bigint;
  readonly locked: boolean;
  readonly outcome: number;
  readonly result_hash: Uint8Array;
  readonly position_count: bigint;
  positions: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  used_nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly resolver: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               market_id_arg_0: Uint8Array,
               deadline_arg_0: bigint,
               resolver_arg_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
