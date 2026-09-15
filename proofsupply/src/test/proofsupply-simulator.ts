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
  type Policy,
  ledger,
  pureCircuits,
} from "../managed/proofsupply/contract/index.js";
import { type ProofSupplyPrivateState, witnesses } from "../witnesses.js";

/**
 * Runs the ProofSupply contract entirely off-chain, against the local
 * Compact runtime simulator — no proof server, indexer, or wallet needed.
 */
export class ProofSupplySimulator {
  readonly contract: Contract<ProofSupplyPrivateState>;
  circuitContext: CircuitContext<ProofSupplyPrivateState>;

  constructor(issuerCommitment: Uint8Array, initialPrivateState: ProofSupplyPrivateState) {
    this.contract = new Contract<ProofSupplyPrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      createConstructorContext(initialPrivateState, "0".repeat(64)),
      issuerCommitment,
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
  }

  /** Switch which party's private state the next circuit call runs as. */
  public actAs(privateState: ProofSupplyPrivateState) {
    this.circuitContext.currentPrivateState = privateState;
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): ProofSupplyPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerCommitment(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerCommitment(this.circuitContext, commitment).context;
    return this.getLedger();
  }

  public revokeCommitment(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.revokeCommitment(this.circuitContext, commitment).context;
    return this.getLedger();
  }

  public qualify(policy: Policy, timestamp: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.qualify(this.circuitContext, policy, timestamp).context;
    return this.getLedger();
  }

  /** The commitment a given set of supplier attributes/secret/nonce would produce (pure, no proof). */
  public static commitmentFor(privateState: ProofSupplyPrivateState): Uint8Array {
    return pureCircuits.credentialCommitmentHash(
      privateState.capacity,
      privateState.quality,
      privateState.bidPrice,
      privateState.leadTime,
      privateState.jurisdiction,
      privateState.credentialSecret,
      privateState.nonce,
    );
  }

  /** The nullifier a given credential secret would produce for a given policy (pure, no proof). */
  public static nullifierFor(credentialSecret: Uint8Array, policyVersionId: Uint8Array): Uint8Array {
    return pureCircuits.policyNullifierHash(credentialSecret, policyVersionId);
  }

  /** The issuer-authorization hash a given issuer secret would produce (pure, no proof). */
  public static issuerCommitmentFor(issuerSecretKey: Uint8Array): Uint8Array {
    return pureCircuits.issuerAuthorizationHash(issuerSecretKey);
  }
}
