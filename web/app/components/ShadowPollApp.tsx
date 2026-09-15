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
    <div className="flex flex-col gap-8">
      <ShadowPollHero state={visualState} />

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-10">
        {fetchError ? (
          <div className="text-sm text-[var(--status-bad)]">
            Couldn&apos;t load live contract state right now: {fetchError}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div>
              <div className="text-xs tracking-[0.2em] text-[var(--muted-2)] uppercase">The question</div>
              <div className="mt-2 text-xl font-medium tracking-[-0.01em] sm:text-2xl">{question}</div>
            </div>

            <VoteBars yesVotes={yesVotes} noVotes={noVotes} />

            <div className="grid grid-cols-3 gap-6 border-t border-[var(--border)] pt-8">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-[var(--muted-2)]">Total votes</div>
                <div className="text-2xl font-medium tabular-nums">{totalVotes}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs text-[var(--muted-2)]">Nullifiers spent</div>
                <div className="text-2xl font-medium tabular-nums">{nullifierCount}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs text-[var(--muted-2)]">Network</div>
                <div className="text-2xl font-medium capitalize">{networkId}</div>
              </div>
            </div>

            {fetchedAtLabel ? (
              <div className="text-xs text-[var(--muted-2)]">
                Live from the public indexer · refreshed {fetchedAtLabel}
              </div>
            ) : null}

            <VotePanel networkId={networkId} contractAddress={contractAddress} />
          </div>
        )}
      </section>
    </div>
  );
}
