/*
 * Defines the shape of the private state held locally by whichever party is
 * proving a circuit call, and the witness functions the contract needs.
 *
 * Two roles share this shape in these tests/tools: the issuer (who only
 * needs `issuerSecretKey`) and a supplier (who needs their own commercial
 * attributes plus their credential secret and nonce). In a real deployment
 * each party would only ever populate the fields relevant to their own
 * role — nothing here is ever combined or compared across parties locally;
 * the contract's own assertions are what connect them.
 */

import { Ledger } from "./managed/proofsupply/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type ProofSupplyPrivateState = {
  readonly issuerSecretKey: Uint8Array;
  readonly capacity: bigint;
  readonly quality: bigint;
  readonly bidPrice: bigint;
  readonly leadTime: bigint;
  readonly jurisdiction: Uint8Array;
  readonly credentialSecret: Uint8Array;
  readonly nonce: Uint8Array;
};

export const createIssuerPrivateState = (issuerSecretKey: Uint8Array): ProofSupplyPrivateState => ({
  issuerSecretKey,
  capacity: 0n,
  quality: 0n,
  bidPrice: 0n,
  leadTime: 0n,
  jurisdiction: new Uint8Array(32),
  credentialSecret: new Uint8Array(32),
  nonce: new Uint8Array(32),
});

export const createSupplierPrivateState = (attrs: {
  capacity: bigint;
  quality: bigint;
  bidPrice: bigint;
  leadTime: bigint;
  jurisdiction: Uint8Array;
  credentialSecret: Uint8Array;
  nonce: Uint8Array;
}): ProofSupplyPrivateState => ({
  issuerSecretKey: new Uint8Array(32),
  ...attrs,
});

export const witnesses = {
  issuerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, ProofSupplyPrivateState>): [ProofSupplyPrivateState, Uint8Array] => [
    privateState,
    privateState.issuerSecretKey,
  ],

  supplierWitness: ({
    privateState,
  }: WitnessContext<Ledger, ProofSupplyPrivateState>): [
    ProofSupplyPrivateState,
    [bigint, bigint, bigint, bigint, Uint8Array, Uint8Array, Uint8Array],
  ] => [
    privateState,
    [
      privateState.capacity,
      privateState.quality,
      privateState.bidPrice,
      privateState.leadTime,
      privateState.jurisdiction,
      privateState.credentialSecret,
      privateState.nonce,
    ],
  ],
};
