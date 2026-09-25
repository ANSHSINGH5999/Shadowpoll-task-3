# Product Proposal — ShadowPoll

## What is the product, and who uses it?

ShadowPoll is a privacy-preserving Yes/No poll on Midnight. A poll creator deploys a contract with one
question; every eligible voter can cast exactly one ballot; anyone can read and independently verify the
running tally — but nobody (not the creator, not the dashboard, not a chain observer) can tell who voted
or how any individual voted.

**Users:**

- **DAO and community governance teams** that need binding, auditable decisions without exposing members
  to social pressure, vote-buying, or retaliation for how they voted.
- **Organisations running sensitive internal votes** — employee pulse surveys, union ballots, board
  straw polls — where the tally must be trustworthy but individual answers must stay anonymous.
- **Voters**, who get a verifiable guarantee (a ZK proof checked by the chain, not a promise from a
  survey vendor) that their ballot counted once and cannot be linked back to them.

## Why Midnight specifically?

A transparent chain (Ethereum, Solana, etc.) forces a trade-off: either votes are public and linkable to
wallet addresses, or privacy is bolted on with off-chain mixers, commit-reveal schemes, or a trusted
tallier. Midnight removes that trade-off at the language level:

- **Private witnesses.** The voter's secret key is supplied by `witness voterSecretKey()` and only ever
  exists on the voter's machine while the proof is generated. It is never part of the transaction.
- **Nullifiers enforced by a ZK circuit.** `castVote` proves "I know a secret whose domain-separated
  `persistentHash` is this nullifier, and it is not in the spent set" — giving one-person-one-vote
  without an identity lookup.
- **Explicit `disclose()`.** The Compact compiler rejects any path where witness-derived data reaches
  public ledger state without an explicit `disclose(...)`. ShadowPoll discloses exactly two values — the
  nullifier and the vote boolean — so the privacy boundary is auditable in the source, not implied.
- **Public, verifiable state.** Tallies and the nullifier set live in ordinary public ledger state, so the
  result is checkable by anyone through the public indexer with no trusted counting party.

Midnight gives us selective disclosure as a first-class primitive. On a transparent chain we would have to
rebuild this with custom ZK verifier contracts plus relayers to hide the sender.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| `question` (poll text) | Public ledger (`Opaque<"string">`, set in constructor) | Everyone |
| `yesVotes` | Public ledger (`Counter`) | Everyone |
| `noVotes` | Public ledger (`Counter`) | Everyone |
| `nullifiers` — one-way hash per ballot | Public ledger (`Set<Bytes<32>>`), written via `disclose()` | Everyone (unlinkable to a person) |
| Vote choice (`voteYes: Boolean`) | Circuit argument, `disclose()`d only to pick which counter to increment | Everyone sees that *a* tally moved; not who moved it |
| `voterSecretKey` | Private witness (`Bytes<32>`), held in local private state | No one — never leaves the voter's machine |
| ZK proof of `castVote` | Transaction payload | Everyone (reveals nothing beyond the statement proved) |

**What an observer learns:** the question, the totals, and how many distinct credentials have voted.
**What they cannot learn:** which person owns any nullifier, the secret key behind it, or (because
nullifiers are domain-separated) whether the same voter took part in two different polls.

**Known leak and its mitigation plan:** a single vote transaction reveals which counter it moved at that
moment. With many voters and batched submission this is a weak signal; hiding it entirely (by tallying
over shielded commitments and revealing only at close) is on the roadmap below.

## Mainnet Feasibility

**Yes — realistic by Level 6**, because the core is already built and deployed:

| Level | Scope | Status |
|---|---|---|
| Now | Compact contract, 8 simulator tests (logic, state, privacy), CI compile + test, live Preview deployment (Preprod deploy pending faucet funding), Next.js dashboard reading live indexer state | Done |
| Next | Voter-eligibility registry: poll creator publishes a Merkle root of credential commitments; `castVote` proves membership without revealing which leaf | Small circuit change + tests |
| Next | End-to-end Lace wallet voting from the dashboard (wiring exists, needs verified round trip) | Integration + QA |
| Level 5 | Poll lifecycle (open/close by creator key), multiple polls per deployment, hide per-tx direction until close | Contract extension |
| Level 6 | Security review of circuits and witness handling, load test on Preprod, Mainnet deploy + monitoring on the public indexer | Hardening + launch |

The riskiest pieces — the ZK circuit, the nullifier scheme, and the indexer read path — are already proven
on live testnets. The remaining work is feature scope and hardening, not unknown research, so a Level 6
Mainnet target is realistic for a single developer.
