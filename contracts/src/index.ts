import { CompiledContract } from "@midnight-ntwrk/compact-js";
import * as VeilcastMarketContract from "../managed/veilcast-market/contract/index.js";
import { createWitnesses } from "./witnesses.js";

export * as VeilcastMarket from "../managed/veilcast-market/contract/index.js";
export {
  createMarketPrivateState,
  createWitnesses,
} from "./witnesses.js";
export type { MarketPrivateState, PrivatePosition } from "./witnesses.js";

export const CompiledVeilcastMarketContract = CompiledContract.make(
  "veilcast-market",
  VeilcastMarketContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets("./managed/veilcast-market"),
);
