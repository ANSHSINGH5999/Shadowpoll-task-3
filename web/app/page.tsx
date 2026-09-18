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
    <main className="flex flex-1 flex-col">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[var(--foreground)]">
          ShadowPoll
        </span>
        <div className="flex items-center gap-5 text-xs text-[var(--muted)]">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span>🌑</span>
            <span>New Moon · Preview testnet</span>
          </span>
          <a
            href="https://github.com/ANSHSINGH5999/Shadowpoll-task-3"
            className="border-b border-transparent text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero — the privacy-core visualization is the product, not decoration */}
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pt-8 pb-4 sm:px-10 sm:pt-16">
        <div className="flex max-w-2xl flex-col gap-6">
          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.02em]">
            A vote that&apos;s <span className="font-serif italic text-[var(--accent)]">counted</span>,
            <br />
            never <span className="font-serif italic">traced</span>.
          </h1>
          <p className="max-w-md text-base text-[var(--muted)] sm:text-lg">
            ShadowPoll is a privacy-preserving Yes/No poll, live on Midnight. Anyone can verify the
            tally. Nobody — not even this page — can see who voted, or how.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-6 sm:px-10">
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
      </div>

      <section
        className="mx-auto w-full max-w-5xl px-6 sm:px-10"
        style={{ paddingBlock: "var(--space-section)" }}
      >
        <div className="grid gap-10 border-t border-[var(--border)] pt-12 sm:grid-cols-[1fr_1.1fr] sm:gap-16">
          <div className="flex flex-col gap-4">
            <span className="text-xs tracking-[0.2em] text-[var(--muted-2)] uppercase">How it works</span>
            <h2 className="text-2xl font-medium tracking-[-0.01em] sm:text-3xl">
              Public result. <span className="text-[var(--muted)]">Private identity.</span>
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Every voter authenticates with a secret key that never leaves their own machine — a{" "}
              <em className="text-[var(--foreground)] not-italic">private witness</em>. The circuit derives a
              one-way hash of that key (a <em className="text-[var(--foreground)] not-italic">nullifier</em>)
              and, deliberately, only <code className="text-[var(--foreground)]">disclose()</code>s that hash
              and the Yes/No choice onto the public ledger. The nullifier blocks a second vote from the same
              key; nobody can work backwards from it to the voter&apos;s identity.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background-raised)] p-5 text-xs leading-relaxed text-[var(--muted)] sm:text-[13px]">
            <code>{`export circuit castVote(voteYes: Boolean): [] {
  const nullifier = disclose(voteNullifier(voterSecretKey()));
  assert(!nullifiers.member(nullifier), "already voted");
  nullifiers.insert(nullifier);
  const disclosedVote = disclose(voteYes);
  if (disclosedVote) { yesVotes.increment(1); } else { noVotes.increment(1); }
}`}</code>
          </pre>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-2 border-t border-[var(--border)] px-6 py-10 text-xs text-[var(--muted-2)] sm:px-10">
        <div>
          Contract address:{" "}
          <span className="font-mono text-[var(--muted)]">{truncateMiddle(CONTRACT_ADDRESS)}</span>
        </div>
        <div>
          Deployment tx: <span className="font-mono text-[var(--muted)]">{truncateMiddle(DEPLOY_TX_HASH)}</span>{" "}
          (block {DEPLOY_BLOCK})
        </div>
      </footer>
    </main>
  );
}
