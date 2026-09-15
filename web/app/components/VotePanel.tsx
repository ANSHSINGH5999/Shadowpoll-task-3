"use client";

import { useShadowPollWallet } from "@/lib/wallet/useShadowPollWallet";

type VotePanelProps = {
  networkId: string;
  contractAddress: string;
};

function truncateMiddle(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function VotePanel({ networkId, contractAddress }: VotePanelProps) {
  const { walletState, voteState, address, errorMessage, lastTxHash, connect, castVote } = useShadowPollWallet(
    networkId,
    contractAddress,
  );

  const voting = voteState === "processing";

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-8">
      {walletState !== "connected" ? (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Connect a Midnight wallet (e.g. Lace) to cast a real, privacy-preserving ballot.
          </p>
          <button
            type="button"
            onClick={connect}
            disabled={walletState === "connecting"}
            className="shrink-0 rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition-transform duration-200 hover:-translate-y-px disabled:translate-y-0 disabled:opacity-50"
          >
            {walletState === "connecting" ? "Connecting…" : "Connect wallet →"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-xs text-[var(--muted-2)]">
            Connected as <span className="font-mono text-[var(--muted)]">{truncateMiddle(address ?? "")}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => castVote(true)}
              disabled={voting}
              className="flex-1 rounded-full border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--series-yes)] transition-colors duration-200 hover:border-[var(--series-yes)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {voting ? "Submitting…" : "Vote Yes"}
            </button>
            <button
              type="button"
              onClick={() => castVote(false)}
              disabled={voting}
              className="flex-1 rounded-full border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--series-no)] transition-colors duration-200 hover:border-[var(--series-no)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {voting ? "Submitting…" : "Vote No"}
            </button>
          </div>
          {voteState === "submitted" || voteState === "confirmed" ? (
            <p className="text-xs text-[var(--status-good)]">
              Vote submitted. Tx: <span className="font-mono">{truncateMiddle(lastTxHash ?? "")}</span> — the tally
              above updates once the indexer picks it up (usually within a block or two).
            </p>
          ) : null}
          {voteState === "already-voted" ? (
            <p className="text-xs text-[var(--status-bad)]">
              This wallet has already cast a ballot in this poll — that&apos;s the nullifier check working as
              intended.
            </p>
          ) : null}
        </div>
      )}
      {errorMessage ? <p className="text-xs text-[var(--status-bad)]">{errorMessage}</p> : null}
    </div>
  );
}
