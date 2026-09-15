import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Policy = { policyVersionId: Uint8Array;
                       minCapacity: bigint;
                       minQuality: bigint;
                       maxBidPrice: bigint;
                       maxLeadTimeDays: bigint;
                       requiredJurisdiction: Uint8Array
                     };

export type QualificationReceipt = { policyVersionId: Uint8Array;
                                     credentialCommitment: Uint8Array;
                                     nullifier: Uint8Array;
                                     timestamp: bigint;
                                     result: boolean
                                   };

export type Witnesses<PS> = {
  issuerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  supplierWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [bigint,
                                                                               bigint,
                                                                               bigint,
                                                                               bigint,
                                                                               Uint8Array,
                                                                               Uint8Array,
                                                                               Uint8Array]];
}

export type ImpureCircuits<PS> = {
  registerCommitment(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCommitment(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  qualify(context: __compactRuntime.CircuitContext<PS>,
          policy_0: Policy,
          timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerCommitment(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCommitment(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  qualify(context: __compactRuntime.CircuitContext<PS>,
          policy_0: Policy,
          timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  issuerAuthorizationHash(secret_0: Uint8Array): Uint8Array;
  credentialCommitmentHash(capacity_0: bigint,
                           quality_0: bigint,
                           bidPrice_0: bigint,
                           leadTime_0: bigint,
                           jurisdiction_0: Uint8Array,
                           secret_0: Uint8Array,
                           nonce_0: Uint8Array): Uint8Array;
  policyNullifierHash(secret_0: Uint8Array, policyVersionId_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  registerCommitment(context: __compactRuntime.CircuitContext<PS>,
                     commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCommitment(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  qualify(context: __compactRuntime.CircuitContext<PS>,
          policy_0: Policy,
          timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  issuerAuthorizationHash(context: __compactRuntime.CircuitContext<PS>,
                          secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitmentHash(context: __compactRuntime.CircuitContext<PS>,
                           capacity_0: bigint,
                           quality_0: bigint,
                           bidPrice_0: bigint,
                           leadTime_0: bigint,
                           jurisdiction_0: Uint8Array,
                           secret_0: Uint8Array,
                           nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  policyNullifierHash(context: __compactRuntime.CircuitContext<PS>,
                      secret_0: Uint8Array,
                      policyVersionId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  revocations: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  qualificationReceipts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): QualificationReceipt;
    [Symbol.iterator](): Iterator<[Uint8Array, QualificationReceipt]>
  };
  readonly issuerCommitment: Uint8Array;
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
               issuerCommitment__0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
