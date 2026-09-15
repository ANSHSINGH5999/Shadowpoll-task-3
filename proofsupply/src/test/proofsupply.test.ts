import { describe, it, expect } from "vitest";
import { ProofSupplySimulator } from "./proofsupply-simulator.js";
import { randomBytes } from "./utils.js";
import { createIssuerPrivateState, createSupplierPrivateState } from "../witnesses.js";
import type { Policy } from "../managed/proofsupply/contract/index.js";

const JURISDICTION_US = new Uint8Array(32).fill(7);
const JURISDICTION_EU = new Uint8Array(32).fill(9);

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    policyVersionId: randomBytes(32),
    minCapacity: 1_000n,
    minQuality: 80n,
    maxBidPrice: 50_000n,
    maxLeadTimeDays: 30n,
    requiredJurisdiction: JURISDICTION_US,
    ...overrides,
  };
}

function makeQualifyingSupplier() {
  return createSupplierPrivateState({
    capacity: 5_000n,
    quality: 95n,
    bidPrice: 20_000n,
    leadTime: 10n,
    jurisdiction: JURISDICTION_US,
    credentialSecret: randomBytes(32),
    nonce: randomBytes(32),
  });
}

/** Sets up a simulator with a registered, qualifying supplier commitment. Returns the simulator and the parties. */
function setupRegisteredSupplier() {
  const issuerSecretKey = randomBytes(32);
  const issuerCommitment = ProofSupplySimulator.issuerCommitmentFor(issuerSecretKey);
  const issuer = createIssuerPrivateState(issuerSecretKey);
  const supplier = makeQualifyingSupplier();

  const simulator = new ProofSupplySimulator(issuerCommitment, issuer);
  const commitment = ProofSupplySimulator.commitmentFor(supplier);
  simulator.registerCommitment(commitment);

  return { simulator, issuer, supplier, commitment };
}

describe("ProofSupply smart contract", () => {
  it("initializes with no commitments, nullifiers, revocations, or receipts", () => {
    const issuerSecretKey = randomBytes(32);
    const issuerCommitment = ProofSupplySimulator.issuerCommitmentFor(issuerSecretKey);
    const simulator = new ProofSupplySimulator(issuerCommitment, createIssuerPrivateState(issuerSecretKey));
    const ledgerState = simulator.getLedger();
    expect(ledgerState.commitments.isEmpty()).toEqual(true);
    expect(ledgerState.nullifiers.isEmpty()).toEqual(true);
    expect(ledgerState.revocations.isEmpty()).toEqual(true);
    expect(ledgerState.qualificationReceipts.isEmpty()).toEqual(true);
    expect(ledgerState.issuerCommitment).toEqual(issuerCommitment);
  });

  it("positive path: a supplier who meets every policy threshold qualifies", () => {
    const { simulator, supplier, commitment } = setupRegisteredSupplier();
    const policy = makePolicy();

    simulator.actAs(supplier);
    const ledgerState = simulator.qualify(policy, 1_700_000_000n);

    const nullifier = ProofSupplySimulator.nullifierFor(supplier.credentialSecret, policy.policyVersionId);
    expect(ledgerState.nullifiers.member(nullifier)).toEqual(true);
    expect(ledgerState.qualificationReceipts.member(nullifier)).toEqual(true);

    const receipt = ledgerState.qualificationReceipts.lookup(nullifier);
    expect(receipt.result).toEqual(true);
    expect(receipt.credentialCommitment).toEqual(commitment);
    expect(receipt.policyVersionId).toEqual(policy.policyVersionId);
    expect(receipt.timestamp).toEqual(1_700_000_000n);
  });

  it("never reveals the supplier's private attributes or credential secret on the public ledger", () => {
    const { simulator, supplier } = setupRegisteredSupplier();
    const policy = makePolicy();
    simulator.actAs(supplier);
    const ledgerState = simulator.qualify(policy, 1n);
    for (const nullifier of ledgerState.nullifiers) {
      expect(nullifier).not.toEqual(supplier.credentialSecret);
    }
    for (const [, receipt] of ledgerState.qualificationReceipts) {
      expect(receipt.credentialCommitment).not.toEqual(supplier.credentialSecret);
    }
  });

  it("negative path: low capacity fails qualification", () => {
    const { simulator } = setupRegisteredSupplier();
    const lowCapacitySupplier = createSupplierPrivateState({
      capacity: 10n, // below the policy minimum
      quality: 95n,
      bidPrice: 20_000n,
      leadTime: 10n,
      jurisdiction: JURISDICTION_US,
      credentialSecret: randomBytes(32),
      nonce: randomBytes(32),
    });
    const lowCapacityCommitment = ProofSupplySimulator.commitmentFor(lowCapacitySupplier);
    simulator.registerCommitment(lowCapacityCommitment);

    simulator.actAs(lowCapacitySupplier);
    expect(() => simulator.qualify(makePolicy(), 1n)).toThrow("Capacity does not meet the policy's minimum");
  });

  it("negative path: jurisdiction mismatch fails qualification", () => {
    const { simulator } = setupRegisteredSupplier();
    const wrongJurisdictionSupplier = createSupplierPrivateState({
      capacity: 5_000n,
      quality: 95n,
      bidPrice: 20_000n,
      leadTime: 10n,
      jurisdiction: JURISDICTION_EU,
      credentialSecret: randomBytes(32),
      nonce: randomBytes(32),
    });
    simulator.registerCommitment(ProofSupplySimulator.commitmentFor(wrongJurisdictionSupplier));

    simulator.actAs(wrongJurisdictionSupplier);
    expect(() => simulator.qualify(makePolicy({ requiredJurisdiction: JURISDICTION_US }), 1n)).toThrow(
      "Jurisdiction does not match the policy's requirement",
    );
  });

  it("negative path: an unregistered commitment cannot qualify", () => {
    const issuerSecretKey = randomBytes(32);
    const issuerCommitment = ProofSupplySimulator.issuerCommitmentFor(issuerSecretKey);
    const simulator = new ProofSupplySimulator(issuerCommitment, createIssuerPrivateState(issuerSecretKey));
    const supplier = makeQualifyingSupplier(); // never registered

    simulator.actAs(supplier);
    expect(() => simulator.qualify(makePolicy(), 1n)).toThrow("Credential commitment is not registered");
  });

  it("negative path: a revoked commitment cannot qualify, even if it once met every threshold", () => {
    const { simulator, supplier, commitment } = setupRegisteredSupplier();
    simulator.revokeCommitment(commitment);

    simulator.actAs(supplier);
    expect(() => simulator.qualify(makePolicy(), 1n)).toThrow("Credential commitment has been revoked");
  });

  it("negative path: the same credential cannot be submitted twice against the same policy (nullifier reuse)", () => {
    const { simulator, supplier } = setupRegisteredSupplier();
    const policy = makePolicy();

    simulator.actAs(supplier);
    simulator.qualify(policy, 1n);

    expect(() => simulator.qualify(policy, 2n)).toThrow(
      "This credential has already been submitted against this policy",
    );
  });

  it("the same credential CAN qualify again against a different policy version (nullifier is policy-scoped)", () => {
    const { simulator, supplier } = setupRegisteredSupplier();
    const policyA = makePolicy();
    const policyB = makePolicy({ policyVersionId: randomBytes(32) });

    simulator.actAs(supplier);
    simulator.qualify(policyA, 1n);
    const ledgerState = simulator.qualify(policyB, 2n);

    expect(ledgerState.nullifiers.size()).toEqual(2n);
  });

  it("negative path: only the authorized issuer can register a commitment", () => {
    const issuerSecretKey = randomBytes(32);
    const issuerCommitment = ProofSupplySimulator.issuerCommitmentFor(issuerSecretKey);
    const simulator = new ProofSupplySimulator(issuerCommitment, createIssuerPrivateState(issuerSecretKey));

    const impostor = createIssuerPrivateState(randomBytes(32)); // wrong secret key
    simulator.actAs(impostor);
    expect(() => simulator.registerCommitment(randomBytes(32))).toThrow("Caller is not the authorized issuer");
  });

  it("negative path: only the authorized issuer can revoke a commitment", () => {
    const { simulator, commitment } = setupRegisteredSupplier();
    const impostor = createIssuerPrivateState(randomBytes(32));
    simulator.actAs(impostor);
    expect(() => simulator.revokeCommitment(commitment)).toThrow("Caller is not the authorized issuer");
  });
});
