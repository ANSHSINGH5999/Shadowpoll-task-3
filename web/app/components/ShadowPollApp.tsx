"use client";

import { useShadowPollWallet } from "@/lib/wallet/useShadowPollWallet";
import { ShadowPollHero } from "./3d/ShadowPollHero";
import { VoteBars } from "./VoteBars";
import { VotePanel } from "./VotePanel";
import type { PublicPollState, ShadowPollVisualState } from "./3d/types";

type ShadowPollAppProps = {
  networkId: string;
  contractAddress: string;
  question: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  nullifierCount: number;
  fetchError: string | null;
  fetchedAtLabel: string | null;
};

/**
 * Owns the one real client-side connection to the wallet + vote flow (via
 * useShadowPollWallet) and shares its state between the 3D visualization and
 * the vote controls, so they never disagree about what's actually happening.
 */
export function ShadowPollApp({
  networkId,
  contractAddress,
  question,
  yesVotes,
  noVotes,
  totalVotes,
  nullifierCount,
  fetchError,
  fetchedAtLabel,
}: ShadowPollAppProps) {
  const { walletState, voteState } = useShadowPollWallet(networkId, contractAddress);

  const status: ShadowPollVisualState = fetchError
    ? "indexer-offline"
    : voteState === "processing"
      ? "processing"
      : voteState === "submitted"
        ? "submitted"
        : voteState === "confirmed"
          ? "confirmed"
          : voteState === "already-voted"
            ? "already-voted"
            : voteState === "failed"
              ? "failed"
              : walletState === "connecting"
                ? "wallet-connecting"
                : walletState === "connected"
                  ? "wallet-connected"
                  : "wallet-disconnected";

  const visualState: PublicPollState = { status, question, yesVotes, noVotes, totalVotes, nullifierCount };

  return (
    <>
      <ShadowPollHero state={visualState} />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        {fetchError ? (
          <div className="text-sm text-[var(--series-no)]">
            Couldn&apos;t load live contract state right now: {fetchError}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">The question</div>
              <div className="mt-1 text-xl font-medium">{question}</div>
            </div>

            <VoteBars yesVotes={yesVotes} noVotes={noVotes} />

            <div className="grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-6 text-sm">
              <div>
                <div className="text-[var(--muted)]">Total votes</div>
                <div className="text-lg font-semibold tabular-nums">{totalVotes}</div>
              </div>
              <div>
                <div className="text-[var(--muted)]">Nullifiers spent</div>
                <div className="text-lg font-semibold tabular-nums">{nullifierCount}</div>
              </div>
              <div>
                <div className="text-[var(--muted)]">Network</div>
                <div className="text-lg font-semibold capitalize">{networkId}</div>
              </div>
            </div>

            {fetchedAtLabel ? (
              <div className="text-xs text-[var(--muted)]">Live from the public indexer · refreshed {fetchedAtLabel}</div>
            ) : null}

            <VotePanel networkId={networkId} contractAddress={contractAddress} />
          </div>
        )}
      </section>
    </>
  );
}
