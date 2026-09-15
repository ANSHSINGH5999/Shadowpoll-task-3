import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/proofsupply/contract/index.js";
export * from "./witnesses.js";

import * as CompiledProofSupplyContract from "./managed/proofsupply/contract/index.js";
import * as Witnesses from "./witnesses.js";

export const CompiledProofSupplyContractContract = CompiledContract.make<
  CompiledProofSupplyContract.Contract<Witnesses.ProofSupplyPrivateState>
>(
  "ProofSupply",
  CompiledProofSupplyContract.Contract<Witnesses.ProofSupplyPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/proofsupply"),
);
