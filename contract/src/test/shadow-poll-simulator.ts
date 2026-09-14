import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  pureCircuits,
} from "../managed/shadow_poll/contract/index.js";
import { type ShadowPollPrivateState, witnesses } from "../witnesses.js";

/**
 * Runs the ShadowPoll contract entirely off-chain, against the local
 * Compact runtime simulator. This is what the `npm test` suite exercises —
 * no proof server, indexer, or wallet is required.
 */
export class ShadowPollSimulator {
  readonly contract: Contract<ShadowPollPrivateState>;
  circuitContext: CircuitContext<ShadowPollPrivateState>;

  constructor(secretKey: Uint8Array, question: string) {
    this.contract = new Contract<ShadowPollPrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext({ secretKey }, "0".repeat(64)),
        question,
      );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /** Switch to a different voter's secret key. */
  public switchVoter(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = { secretKey };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): ShadowPollPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public castVote(voteYes: boolean): Ledger {
    this.circuitContext = this.contract.impureCircuits.castVote(
      this.circuitContext,
      voteYes,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /** The public nullifier a given secret key would produce (pure, no proof). */
  public nullifierFor(secretKey: Uint8Array): Uint8Array {
    return pureCircuits.voteNullifier(secretKey);
  }
}
