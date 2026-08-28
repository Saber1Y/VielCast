import { findDeployedContract, deployContract, type FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { CompiledVeilcastMarketContract } from "./index.js";
import { createMarketPrivateState, type MarketPrivateState, type PrivatePosition } from "./witnesses.js";

export const marketPrivateStateId = "veilcastMarketPrivateState" as const;
export type MarketCircuitKeys = "submitPosition" | "lockMarket" | "resolveMarket" | "claim";
export type MarketProviders = MidnightProviders<MarketCircuitKeys, typeof marketPrivateStateId, MarketPrivateState>;
export type DeployedMarketContract = FoundContract<any>;

export class MarketAPI {
  private constructor(public readonly deployedContract: DeployedMarketContract) {}

  get contractAddress(): ContractAddress {
    return this.deployedContract.deployTxData.public.contractAddress;
  }

  async submitPosition(commitment: Uint8Array): Promise<void> {
    await (this.deployedContract as any).callTx.submitPosition(commitment);
  }

  async lockMarket(): Promise<void> {
    await (this.deployedContract as any).callTx.lockMarket();
  }

  async resolveMarket(outcome: 1 | 2, resultHash: Uint8Array): Promise<void> {
    await (this.deployedContract as any).callTx.resolveMarket(outcome, resultHash);
  }

  async claim(commitment: Uint8Array, nullifier: Uint8Array): Promise<void> {
    await (this.deployedContract as any).callTx.claim(commitment, nullifier);
  }

  static async deploy(
    providers: MarketProviders,
    marketId: Uint8Array,
    deadline: bigint,
    resolver: Uint8Array,
    position: PrivatePosition,
    resolverSecret: Uint8Array,
  ): Promise<MarketAPI> {
    const deployed = await deployContract(providers as any, {
      compiledContract: CompiledVeilcastMarketContract,
      privateStateId: marketPrivateStateId,
      initialPrivateState: createMarketPrivateState(position, resolverSecret),
      args: [marketId, deadline, resolver],
    });
    return new MarketAPI(deployed);
  }

  static async join(
    providers: MarketProviders,
    contractAddress: ContractAddress,
    position: PrivatePosition,
    resolverSecret: Uint8Array,
  ): Promise<MarketAPI> {
    const deployed = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: CompiledVeilcastMarketContract,
      privateStateId: marketPrivateStateId,
      initialPrivateState: createMarketPrivateState(position, resolverSecret),
    });
    return new MarketAPI(deployed);
  }
}
