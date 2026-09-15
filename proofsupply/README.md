# ProofSupply

A privacy-preserving B2B procurement qualification protocol on Midnight. A supplier
holds private commercial attributes (capacity, quality, bid price, lead time,
jurisdiction) behind an anchored, issuer-registered credential commitment. To
qualify against a buyer's policy, the supplier proves in zero knowledge that
**every** attribute clears the policy's thresholds — without ever revealing the
attributes themselves. Only a policy-scoped nullifier, the credential commitment,
the boolean result, and a timestamp are ever disclosed to the public ledger.

## Contract (`src/proofsupply.compact`)

**Public ledger state**
- `commitments: Set<Bytes<32>>` — active, issuer-registered credential commitments
- `nullifiers: Set<Bytes<32>>` — policy-scoped nullifiers, block duplicate submissions
- `revocations: Set<Bytes<32>>` — revoked credential commitments
- `qualificationReceipts: Map<Bytes<32>, QualificationReceipt>` — public receipts keyed by nullifier
- `issuerCommitment: Bytes<32>` — hash of the authorized issuer's secret, set at construction

**Circuits**
- `registerCommitment(commitment)` / `revokeCommitment(commitment)` — issuer-only (gated by a
  witness proving knowledge of the secret behind `issuerCommitment`, the same
  shared-secret-hash pattern used for the supplier's own credential commitment — no
  separate PKI needed)
- `qualify(policy, timestamp)` — loads the supplier's private attributes from the
  `supplierWitness()` witness, recomputes their credential commitment, asserts it's
  registered and not revoked, asserts every attribute clears the policy's threshold,
  discloses a policy-scoped nullifier, and records the public receipt

`credentialCommitmentHash`, `policyNullifierHash`, and `issuerAuthorizationHash` are
exported as pure circuits (no proof needed) so both tests and real off-chain tooling
(the issuer verifying a supplier's commitment before registering it) can compute the
same hashes independently — the same pattern ShadowPoll uses for its vote nullifier.

## Client-side prover (`src/client/`)

- `connect.ts` — finds and connects a compatible wallet (DApp Connector API 4.x) under
  `window.midnight`
- `providers.ts` — builds the contract's providers entirely from the connected wallet:
  balancing and submission delegate to the wallet, and proving delegates to
  `connectedAPI.getProvingProvider()` (the current, non-deprecated approach — no HTTP
  proof server or private key ever touches this code)
- `generateQualificationProof(connectedAPI, options)` — the main entry point: builds a
  supplier's private witness locally, finds the deployed contract, calls `qualify`,
  and returns `{ txHash, nullifier, receipt }` — never the underlying attributes or
  credential secret, and nothing here is ever logged
- `deployProofSupplyContract(connectedAPI, options)` — deploys a fresh instance
  anchored to an issuer's secret

## Setup

```bash
npm install
npm run compact   # compact compile src/proofsupply.compact ./src/managed/proofsupply
npm test          # 11 tests, offline simulator — no proof server needed
npm run build
```

## Test vectors (`src/test/proofsupply.test.ts`)

- **Positive**: a supplier meeting every policy threshold qualifies; the receipt is
  public but the attributes and credential secret never appear on the ledger.
- **Negative — low capacity**: below `policy.minCapacity` aborts with the specific assert message.
- **Negative — jurisdiction mismatch**: wrong jurisdiction aborts.
- **Negative — unregistered commitment**: a credential the issuer never registered can't qualify.
- **Negative — revoked commitment**: a revoked commitment can't qualify even if attributes clear every threshold.
- **Negative — nullifier reuse**: the same credential can't submit twice against the same policy version, but *can* qualify again under a different policy version (the nullifier is policy-scoped, not global).
- **Negative — unauthorized issuer**: registering/revoking with the wrong secret fails.
