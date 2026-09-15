import { getPollSnapshot, CONTRACT_ADDRESS, DEPLOY_TX_HASH, DEPLOY_BLOCK, NETWORK } from "@/lib/shadowpoll";
import { ShadowPollApp } from "./components/ShadowPollApp";

export const revalidate = 15;

function truncateMiddle(value: string, head = 10, tail = 8) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default async function Home() {
  let snapshot: Awaited<ReturnType<typeof getPollSnapshot>> | null = null;
  let error: string | null = null;
  try {
    snapshot = await getPollSnapshot();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error fetching contract state";
  }

  // Formatted server-side, once, and passed down as a plain string — doing
  // this inside a client component would format with the server's locale
  // during SSR and the browser's locale on hydration, mismatching.
  const fetchedAtLabel = snapshot
    ? new Date(snapshot.fetchedAt).toLocaleTimeString("en-US", { timeZone: "UTC", timeZoneName: "short" })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          <span>🌑</span>
          <span>New Moon · Level 1 · Midnight Preview testnet</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">ShadowPoll</h1>
        <p className="max-w-prose text-[var(--muted)]">
          A privacy-preserving Yes/No poll running live on Midnight. Anyone can read the
          tallies below — nobody, including this page, can see who voted or how.
        </p>
      </header>

      <ShadowPollApp
        networkId={NETWORK}
        contractAddress={CONTRACT_ADDRESS}
        question={snapshot?.question ?? ""}
        yesVotes={snapshot?.yesVotes ?? 0}
        noVotes={snapshot?.noVotes ?? 0}
        totalVotes={snapshot?.totalVotes ?? 0}
        nullifierCount={snapshot?.nullifierCount ?? 0}
        fetchError={error}
        fetchedAtLabel={fetchedAtLabel}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Public state vs. private witness</h2>
        <p className="text-sm text-[var(--muted)]">
          Every voter authenticates with a secret key that never leaves their own machine — a{" "}
          <em>private witness</em>. The circuit derives a one-way hash of that key (a
          <em> nullifier</em>) and, deliberately, only <code>disclose()</code>s that hash and the
          Yes/No choice onto the public ledger. The nullifier blocks a second vote from the same
          key; nobody can work backwards from it to the voter&apos;s identity.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-[var(--background)] p-4 text-xs leading-relaxed">
          <code>{`export circuit castVote(voteYes: Boolean): [] {
  const nullifier = disclose(voteNullifier(voterSecretKey()));
  assert(!nullifiers.member(nullifier), "already voted");
  nullifiers.insert(nullifier);
  const disclosedVote = disclose(voteYes);
  if (disclosedVote) { yesVotes.increment(1); } else { noVotes.increment(1); }
}`}</code>
        </pre>
      </section>

      <footer className="flex flex-col gap-2 text-xs text-[var(--muted)]">
        <div>
          Contract address:{" "}
          <span className="font-mono text-[var(--foreground)]">{truncateMiddle(CONTRACT_ADDRESS)}</span>
        </div>
        <div>
          Deployment tx:{" "}
          <span className="font-mono text-[var(--foreground)]">{truncateMiddle(DEPLOY_TX_HASH)}</span> (block{" "}
          {DEPLOY_BLOCK})
        </div>
        <div className="pt-2">
          <a
            className="underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]"
            href="https://github.com/ANSHSINGH5999/shadowpoll"
          >
            View source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
