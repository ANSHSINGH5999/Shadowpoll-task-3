# ShadowPoll
video link https://youtu.be/FTVW27cwT24
![CI](https://github.com/ANSHSINGH5999/Shadowpoll-task-3/actions/workflows/ci.yml/badge.svg)

> A privacy-preserving Yes/No poll on Midnight — anyone can verify the tally, nobody can see who voted.

## Live Demo

[https://shadowpoll-nu.vercel.app](https://shadowpoll-nu.vercel.app)

## Contract Address

| Network | Address |
|---------|---------|
| Preview | `af9cf4341fe405b0d4967f969b4fc9271fee80f317e54ac84761971406f95cd4` |
| Preprod | [PASTE PREPROD CONTRACT ADDRESS — pending faucet funding, see below] |

Deployment tx (Preview): `52ecc1066affa226e60e8578e20971a7d7842fba4c42921eccfe65e42287a024` (block 868378). Verify independently against the public indexer:

```bash
curl -s -X POST https://indexer.preview.midnight.network/api/v4/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { contract(address: \"af9cf4341fe405b0d4967f969b4fc9271fee80f317e54ac84761971406f95cd4\") { address state } }"}'
```

## What This Does

ShadowPoll lets anyone publish a Yes/No question, and anyone holding a voter credential cast exactly
one ballot on it. The running tallies (`yesVotes`, `noVotes`) and the set of spent "nullifiers" are
public and independently verifiable — but nothing links a nullifier back to the person who cast it,
and nobody, including the poll's own dashboard, can see how any individual voted.

## Privacy Model

- **What is PUBLIC** (on-chain, visible to anyone): the poll question, the running Yes/No tallies, and
  the set of spent nullifiers (`nullifiers: Set<Bytes<32>>`) used to block double voting.
- **What is PRIVATE** (private witness, never on-chain): the voter's secret key (`voterSecretKey()`).
  It's supplied locally when building the zero-knowledge proof and never leaves the voter's machine.
- **What the user PROVES without revealing**: that they hold a valid, not-yet-used voting credential —
  demonstrated by disclosing only a one-way hash of their secret key (the nullifier), never the secret
  key itself. The contract enforces this at the compiler level: reading the witness, or letting a public
  ledger write depend on a value derived from it, requires an explicit `disclose(...)` call — "what
  becomes public" is an opt-in decision at every step, not a default.

```compact
export ledger question: Opaque<"string">;
export ledger yesVotes: Counter;
export ledger noVotes: Counter;
export ledger nullifiers: Set<Bytes<32>>;

witness voterSecretKey(): Bytes<32>;

export circuit castVote(voteYes: Boolean): [] {
  const nullifier = disclose(voteNullifier(voterSecretKey()));
  assert(!nullifiers.member(nullifier), "This voter has already cast a ballot in this poll");
  nullifiers.insert(nullifier);
  const disclosedVote = disclose(voteYes);
  if (disclosedVote) { yesVotes.increment(1); } else { noVotes.increment(1); }
}
```

`castVote` deliberately discloses exactly two things and nothing else:

1. `voteNullifier(voterSecretKey())` — a `persistentHash` of the secret key with a domain-separation
   tag. One-way (nobody can recover the secret key from it), but deterministic (the same voter always
   produces the same nullifier, so a double vote is caught by `nullifiers.member(...)`).
2. The boolean vote choice itself — disclosed so it can move the public counters. (Compact treats
   *every* circuit argument as witness-like by default; even a plain boolean parameter needs
   `disclose()` before it can affect a branch that writes to the ledger.)

## Privacy Claim

**What an on-chain observer sees:** the poll question, the live Yes/No tallies, the full set of spent
nullifiers (one-way hashes), and — for each vote transaction — a zero-knowledge proof that verifies
against the deployed circuit. Querying the public indexer (see the `curl` command above) returns exactly
this: `question`, `yesVotes`, `noVotes`, and `nullifiers`, nothing else.

**What an on-chain observer cannot see:** which nullifier belongs to which person, the voter's secret
key that produced any given nullifier, or any way to link two different polls' nullifiers back to the
same voter (each nullifier is domain-separated per poll). There is no field, event, or log anywhere in
the contract's ledger state that carries voter identity — the simulator test
`"never reveals the voter's secret key on the public ledger"` (`contract/src/test/shadow-poll.test.ts`)
asserts this directly against the compiled circuit's own output, not just against documentation.

## Tech Stack

Midnight network, Compact language (`0.23`, compiler `0.31.1`), `@midnight-ntwrk/midnight-js-*` `4.1.1`,
Node.js (`v26.7.0`, tested against the `>=22` engines requirement), Docker, Next.js (live dashboard),
Three.js / React Three Fiber (supplementary privacy-model visualization), Vercel (hosting).

## Prerequisites

- [Docker](https://www.docker.com/) running locally
- Node.js 22+ (tested on Node 26)
- The [Compact toolchain](https://docs.midnight.network/tutorial/creating/setting-up) — the `compact`
  CLI plus a downloaded compiler version via `compact update`

## Setup & Run Locally

```bash
git clone https://github.com/ANSHSINGH5999/Shadowpoll-task-3.git
cd Shadowpoll-task-3
npm install
```

### Compile the contract

```bash
cd contract
npm run compact   # runs: compact compile src/shadow_poll.compact ./src/managed/shadow_poll
```

This regenerates `contract/src/managed/shadow_poll/`, containing:

- `zkir/castVote.zkir` — the compiled ZK circuit
- `keys/castVote.prover` / `keys/castVote.verifier` — the proving and verifying keys
- `contract/index.js` / `.d.ts` — the TypeScript contract API
- `compiler/contract-info.json` — the circuit/ledger manifest

See `screenshots/compile-output.png`.

### Deploy to a testnet

Docker must be running. The proof server runs locally regardless of which remote network you target
(only the indexer/node/faucet endpoints are remote); start it once and leave it running (first start
downloads ~25MB of ZK parameters):

```bash
cd cli
npm run proof-server:up   # docker compose up -d — wait ~1-2 min for it to finish downloading
npm run deploy:preview   "Should ShadowPoll ship its New Moon milestone?"
# or
npm run deploy:preprod   "Should ShadowPoll ship its New Moon milestone?"
```

This will generate a fresh wallet, request tDUST from the network faucet, register received NIGHT for
dust generation (transaction fees), and submit the deployment transaction, printing the resulting
**contract address**. See `screenshots/deploy-output.png` for a completed run.

### Cast a vote

```bash
cd cli
node --loader ts-node/esm src/launcher/vote-preview.ts <contractAddress> yes <fundedWalletSeed>
```

### Run the live dashboard

```bash
cd web
npm run dev    # http://localhost:3000
```

Reads the deployed contract's state straight from the public Midnight Preview indexer (no mock data)
and renders the live question, Yes/No tallies, and nullifier count, plus a supplementary Three.js
visualization of the privacy model. It also supports real, client-side voting via a connected Midnight
wallet (e.g. [Lace](https://www.lace.io/)) — see `web/lib/wallet/` for the DApp Connector API
integration. **Not yet verified end-to-end**: an actual Lace-extension connect → prove → submit round
trip requires a real wallet install, which wasn't available in the environment this was built in; the
wiring builds and typechecks cleanly against the real `@midnight-ntwrk/dapp-connector-api@4.x` surface,
and the read path (indexer, `ledger()` decoding) is independently verified.

## Run Tests

```bash
cd contract
npm test
```

Runs an offline simulator (`@midnight-ntwrk/compact-runtime`) against the compiled contract — no proof
server, indexer, or wallet needed. 8 tests covering circuit logic (casting yes/no votes), state
transitions (tally updates, deterministic initial state), and that private inputs are never exposed
(the raw secret key never appears in ledger state, nor anywhere the nullifier does). See
`screenshots/test-output.png`.

This repo also includes a second, more advanced contract, **ProofSupply** (privacy-preserving B2B
procurement qualification — see `proofsupply/README.md`), with its own 11-test suite covering positive
and negative paths (low capacity, revoked commitment, nullifier reuse, unauthorized issuer).

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. Checks out the repo and installs Node.js 22
2. Installs dependencies (`npm ci`)
3. Installs the Compact toolchain and runs `compact compile` against `contract/src/shadow_poll.compact`,
   regenerating `contract/src/managed/shadow_poll/` from scratch (so the committed managed output is
   never trusted blindly — CI proves it's reproducible)
4. Builds the `@shadowpoll/contract` package
5. Runs the vitest suite (`contract/src/test/shadow-poll.test.ts`) against the freshly compiled circuit

A green badge at the top of this README means: the contract compiles cleanly on a fresh checkout, and
all 8 tests (circuit logic, state transitions, privacy) pass against that fresh build.

## Product Proposal

See [PROPOSAL.md](./PROPOSAL.md).

## Initial Idea

ShadowPoll is a minimal building block for private governance on Midnight: anyone can publish a Yes/No
question, and anyone holding a voter credential can cast exactly one ballot without ever revealing *who*
they are or letting *which* choice they made be linkable back to their identity — only the running
tallies and a set of spent nullifiers are public. The core mechanic (a private witness authenticates the
caller, and only a one-way hash derived from it is disclosed) generalizes past simple polls to DAO
governance votes, sealed-bid style community decisions, anonymous employee surveys, or whistleblower
attestations — anywhere a group needs a verifiable, non-repeatable action from its members without a
central party learning who did what.

## Screenshots

- `screenshots/compile-output.png` — `compact compile` output showing the generated circuits
- `screenshots/test-output.png` — the passing test suite
- `screenshots/deploy-output.png` — the deployment run showing the contract address

## What's in this repo

```
contract/            Compact contract, compiled ZK circuits, and simulator tests
  src/shadow_poll.compact
  src/witnesses.ts
  src/managed/        generated by `compact compile` — circuits + proving/verifying keys
  src/test/           vitest suite running against the local Compact runtime simulator
cli/                  Deployment CLI for Preview / Preprod testnets
  src/deploy.ts        builds a wallet, funds it from the faucet, deploys the contract
  src/vote.ts          casts a ballot on an already-deployed contract
  src/launcher/        entry points per network
web/                  Live dashboard + wallet voting (Next.js), deployed on Vercel
  lib/shadowpoll.ts     fetches + decodes real contract state from the public indexer
  lib/wallet/           DApp Connector API integration for real, client-side voting
  app/components/3d/    supplementary Three.js privacy-model visualization
proofsupply/          A second, more advanced privacy-preserving contract (see its own README)
screenshots/          compile output, test run, and deployment output
```

## Toolchain versions used

- Compact CLI: `0.31.1` (compiler), language version `0.23`, runtime `0.16.0`
- Node.js: `v26.7.0`
- Docker: `29.8.0`
- `@midnight-ntwrk/midnight-js-*`: `4.1.1`
- `@midnight-ntwrk/testkit-js`: `4.1.1`
