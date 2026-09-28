# Product Proposal — ShadowPoll

Every technical claim below refers to code in this repository:
`contract/src/shadow_poll.compact` (the contract), `contract/src/witnesses.ts` (the private witness),
`contract/src/test/shadow-poll.test.ts` (the simulator tests), `cli/src/deploy.ts` (deployment) and
`web/lib/shadowpoll.ts` (the dashboard's indexer read path).

## 1. What is the product, and who uses it?

**What it does.** ShadowPoll is a Yes/No poll that runs as a Midnight smart contract. A poll creator
deploys one contract per question. A voter casts one ballot by generating a zero-knowledge proof on their
own machine. Anyone can read the question and the running Yes/No tallies from the public indexer, and
check them without trusting the poll creator. Nobody learns which person cast which ballot.

**The problem.** Today's polls force a choice between two options. A hosted survey tool (Google Forms,
Typeform, an internal HR tool) keeps answers private from other voters, but the operator sees everything
and can edit the count. An on-chain vote on a transparent chain is auditable, but it ties every ballot to
a wallet address forever. For sensitive questions, that exposure leads to self-censorship, social
pressure, vote buying and retaliation.

**Target users.**

- **DAO and community governance teams.** They need an auditable decision without a public record of
  how each member voted.
- **Organisations running sensitive internal votes**, such as employee pulse surveys, union ballots and
  board straw polls. The count must be trustworthy, and individual answers must not reach management.
- **Voters.** Each voter gets a check they can run themselves: their ballot moved the public tally
  exactly once, and the chain holds nothing that names them.

**User flow (as implemented today).**

1. The creator deploys a poll with a question: `npm run deploy:preprod "<question>"` (or
   `deploy:preview`). The constructor writes `question` to public state, and both tallies start at 0.
2. The voter holds a 32-byte secret key in local private state (`createShadowPollPrivateState`). The
   key is supplied to the circuit through the `voterSecretKey()` witness.
3. The voter calls `castVote(true|false)` from the CLI (`cli/src/vote.ts`) or from the dashboard's
   Lace-wallet path (`web/lib/wallet/`). The proof is built locally through the proof server, and only
   the proof and the disclosed values are submitted.
4. Anyone opens the dashboard (https://shadowpoll-nu.vercel.app) or queries the indexer directly. They
   see the question, `yesVotes`, `noVotes` and the number of spent nullifiers.

**Why privacy matters here.** A poll is only worth running if people answer honestly. People answer
honestly when they believe their answer can't be traced back to them. Everyone must still be able to
trust the result. The product exists to provide both properties together.

## 2. Why Midnight specifically?

The design needs three things at once:
- a secret input that never leaves the voter's machine,
- a public rule ("one ballot per credential") enforced against that secret,
- a public result anyone can recount.

Midnight provides each of these as a language- and protocol-level primitive, and ShadowPoll uses every
one of them.

- **Private witness data.** `witness voterSecretKey(): Bytes<32>;` is implemented in
  `contract/src/witnesses.ts` and reads the key from the voter's local private state. The key is a
  private input to the proof. It is never part of the transaction and never written to the ledger.
- **Nullifiers checked inside the circuit.** `castVote` computes
  `voteNullifier(secretKey, kernel.self().bytes)`. This is a `persistentHash` over a domain tag, the
  poll's own contract address, and the secret key. The circuit then asserts
  `!nullifiers.member(nullifier)` before inserting it. The proof shows "I know a secret whose nullifier
  for this poll is N, and N is unspent" without revealing the secret. Because the contract address is
  part of the hash, the same key gives unrelated nullifiers in different polls.
- **Explicit `disclose()`.** The Compact compiler rejects any path where witness-derived data reaches
  public ledger state, or controls a branch that writes to it, without an explicit `disclose(...)`.
  `castVote` has exactly two `disclose` calls: one for the nullifier and one for the vote boolean. The
  constructor has a third, for the question. The whole privacy boundary is therefore those three lines,
  and a reviewer can audit it by reading them. It does not depend on developer discipline.
- **Public ledger state.** `question`, `yesVotes`, `noVotes` and `nullifiers` are ordinary public ledger
  fields. The dashboard decodes them from raw indexer state using the contract's own generated
  `ledger()` function (`web/lib/shadowpoll.ts`). No trusted counting party is involved.
- **Selective disclosure.** The chain learns what it needs to enforce the rules: an unspent nullifier
  and which counter to increment. It learns nothing else.

**Why a conventional public chain exposes too much.** On Ethereum or Solana, a `vote(bool)` call is a
public transaction from a public address. Each ballot is permanently tied to that address, its funding
history and every other action it has taken. Getting ShadowPoll's properties there needs a separately
built ZK verifier contract, a trusted setup or custom circuit toolchain, and a relayer to hide the
sender. All of that sits outside the language, and the compiler cannot check it. On Midnight the witness
and disclosure boundary is part of the contract language itself.

## 3. Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| `question` (poll text) | Public ledger (`Opaque<"string">`) | Everyone |
| `yesVotes` / `noVotes` | Public ledger (`Counter`) | Everyone |
| `nullifiers` (one per ballot) | Public ledger (`Set<Bytes<32>>`), written via `disclose()` | Everyone; a one-way hash, not linked to a person |
| Vote choice (`voteYes`) | Circuit argument, `disclose()`d to pick the counter | Everyone sees which counter a transaction moved |
| `voterSecretKey` | Private witness (`Bytes<32>`) | No one; never leaves the voter's machine |
| ZK proof for `castVote` | Transaction payload | Everyone; proves the statement, reveals no inputs |

The subsections below explain each category in detail.

### Public State

Everything under `export ledger` in `shadow_poll.compact` is public and readable by anyone through the
indexer:

| Field | Type | Written by | Purpose |
|---|---|---|---|
| `question` | `Opaque<"string">` | constructor, `disclose(pollQuestion)` | The poll text |
| `yesVotes` | `Counter` | `castVote` when the disclosed vote is `true` | Public Yes tally |
| `noVotes` | `Counter` | `castVote` when the disclosed vote is `false` | Public No tally |
| `nullifiers` | `Set<Bytes<32>>` | `castVote`, `disclose(voteNullifier(...))` | Spent credentials; blocks double voting |

### Private Witness

| Input | Where it lives | Reaches the chain? |
|---|---|---|
| `voterSecretKey()`, a 32-byte secret | Voter's local private state (`ShadowPollPrivateState.secretKey`), supplied by `witnesses.voterSecretKey` | **No.** Only a one-way hash of it (the nullifier) is disclosed |

The proof itself is public, but it reveals nothing beyond the statement it proves.

### Selective Disclosure

`castVote` discloses exactly two values:

1. **The nullifier**, `persistentHash(["shadowpoll:nullifier:", pollContractAddress, secretKey])`. It
   has to be public so the contract can check it against `nullifiers` and store it. The hash is one-way,
   so the secret key can't be recovered from it. It is deterministic for a given poll, so a repeat vote
   with the same key is rejected ("This voter has already cast a ballot in this poll"). It is bound to
   the poll's contract address, so the same key gives different nullifiers in different polls.
2. **The vote boolean.** It has to be public because it chooses which public counter to increment.
   Compact treats circuit arguments as private by default, so this disclosure is explicit.

Nothing else from `castVote` is disclosed. The test suite covers these properties:
- `"never reveals the voter's secret key on the public ledger"`
- `"counts a yes vote and records the voter's nullifier"`
- `"does not let the same voter double-vote"` (with the same and with a different choice)
- `"gives the same voter unlinkable nullifiers in different polls"`

### What an Observer Can Learn

- The question and the live Yes/No totals.
- How many distinct credentials have voted (`nullifiers.size()`).
- For each vote transaction: its nullifier, which counter it incremented, and when it landed. Because
  the choice and the nullifier are disclosed in the same transaction, an observer can pair each
  nullifier with a Yes or a No.
- Transaction-level metadata that the contract does not control: timing, the fee-paying wallet's
  on-chain activity, and network-level data such as the submitter's IP address, if the submitter uses
  a node they don't control.

### What an Observer Cannot Learn

- The voter's secret key. It is never on the ledger, only its one-way hash is.
- Which person or credential owner produced a given nullifier. The ledger has no identity field, event
  or log.
- Whether the same secret key voted in two different ShadowPoll deployments, because nullifiers are
  bound to each contract's address.

**Stated limitations of the current contract.** These are real and are listed again in Section 4.
- **No eligibility check.** Any 32-byte key can vote, so one person can vote repeatedly with fresh keys.
  The nullifier stops reuse of a key, not Sybil voting.
- **Choice is paired with the nullifier.** A person's ballot stays private only while nothing links
  them to their nullifier, for example through the wallet that paid the fee.

## 4. Mainnet Feasibility (Level 6)

ShadowPoll is **not** Mainnet-ready today. It is a working testnet prototype with a small, auditable
core. The path to Mainnet is scoped below.

### Implemented Today

- Compact contract (`shadow_poll.compact`, language 0.23, compiler 0.31.1) with a private witness,
  poll-bound nullifiers, explicit disclosure, and public tallies.
- Simulator test suite (`contract/src/test/`) covering circuit logic, state transitions, double-vote
  rejection, and privacy (the secret key never appears on the ledger; nullifiers are unlinkable across
  polls).
- CI (`.github/workflows/ci.yml`) that recompiles the contract from source on every push and runs the
  test suite against the fresh build.
- Deployment CLI (`cli/`) for the Preview and Preprod testnets: it funds a wallet from the faucet,
  registers dust, deploys, and prints the address and transaction hash. The live testnet deployments
  are listed in the README's Contract Address section.
- Next.js dashboard on Vercel that reads and decodes real contract state from the public indexer.
- Lace DApp Connector wiring for voting in the browser. It builds and typechecks, but an end-to-end
  round trip through a real Lace extension has not been verified.

### Remaining Engineering Work

| Item | Why it's needed |
|---|---|
| **Eligibility registry.** The creator publishes a Merkle root of voter-credential commitments; `castVote` proves membership without revealing which leaf. | Closes the Sybil gap. This is the most important missing feature. |
| **Poll lifecycle.** Open and close controlled by a creator key; no votes accepted after close. | A final result that can't change after the poll ends. |
| **Hide per-transaction direction.** Tally over shielded commitments or batch votes, and reveal totals only at close. | Removes the nullifier-to-choice pairing described in Section 3. |
| **Multiple polls per deployment**, or a factory. | Lower cost and simpler operations. |
| **Verified Lace voting from the dashboard.** | Onboarding for non-CLI users. |

### Security Requirements

- Independent review of the Compact circuits and every `disclose()` site, including the new
  eligibility circuit.
- A review of witness and key handling:
  - how voters obtain, back up and rotate their secret key;
  - replacing the CLI's hard-coded private-state storage password (`cli/src/deploy.ts`) with a
    user-supplied secret or wallet-derived key storage.
- Privacy review of transaction metadata: fee payment and submission path (whether users need their
  own node or a relayer).
- Keep adding negative-path tests: revoked credentials, closed poll, a Merkle proof for the wrong root.

### Deployment Requirements

- Preprod deployment of the final contract, followed by a load test with realistic voter counts.
- A Mainnet deployment funded with real NIGHT/DUST, with deployment keys managed outside developer
  laptops.
- Pinned toolchain versions (compiler, runtime, `midnight-js-*`) recorded per deployment, so the
  on-chain verifier keys can be reproduced from source.

### Production Risks and Limitations

- **Frontend and backend hardening:**
  - make the dashboard's network and contract address configurable per environment (it is currently
    hard-coded to the Preprod deployment in `web/lib/shadowpoll.ts`);
  - add error states for an unreachable indexer;
  - rate-limit the server-side indexer fetch.
- **Wallet onboarding:** voters need a Midnight wallet with DUST for fees. Mainnet UX must explain this,
  or the creator must sponsor fees.
- **Indexing and observability:**
  - alert on indexer lag or failed transactions;
  - monitor tallies against the nullifier count, which should always equal `yesVotes + noVotes`.
- **Testing:** the current tests use the offline simulator. Mainnet needs integration tests against a
  local or Preprod node with real proofs, plus end-to-end browser tests of the wallet flow.
- **Operations:** a runbook for proof-server availability, incident response, and contract upgrades.
  Deployed circuits are fixed, so a fix means a new deployment and a migration plan.
- **Realistic limits:**
  - proof generation takes seconds on the client;
  - Midnight Mainnet tooling is still maturing, so SDK breaking changes (as seen between
    `midnight-js` versions) need budgeting;
  - the privacy guarantee is only as strong as users' key hygiene and their submission path.

**Assessment.** The riskiest part, a nullifier-based ZK circuit with a strict disclosure boundary, is
built, tested and running on testnet. What remains is well-understood feature and hardening work:
eligibility, lifecycle, vote hiding, audit and operations. No open research problems remain. A Level-6
Mainnet launch is realistic once the eligibility registry and an external circuit review are complete.
