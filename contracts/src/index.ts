import { CompiledContract } from "@midnight-ntwrk/compact-js";
import * as VeilcastMarketContract from "../managed/veilcast-market/contract/index";
import { createWitnesses } from "./witnesses";

export * as VeilcastMarket from "../managed/veilcast-market/contract/index";
export {
  createMarketPrivateState,
  createWitnesses,
} from "./witnesses";
export type { MarketPrivateState, PrivatePosition } from "./witnesses";

export const CompiledVeilcastMarketContract = CompiledContract.make(
  "veilcast-market",
  VeilcastMarketContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets("./managed/veilcast-market"),
);
