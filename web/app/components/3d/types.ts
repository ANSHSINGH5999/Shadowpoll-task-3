/**
 * Visual state for the 3D privacy scene, adapted to what this page actually
 * knows. This dashboard is a read-only view of live chain state (no wallet
 * connection or in-browser voting flow lives here — votes are cast out of
 * band via the CLI), so the state machine only reflects things that are
 * really true: whether we could reach the indexer, and the live tallies.
 * We deliberately do NOT invent "wallet-connected" / "processing" /
 * "proof-generated" states, since nothing on this page produces them.
 */
export type ShadowPollVisualState = "loading" | "indexer-offline" | "live";

export type PublicPollState = {
  status: ShadowPollVisualState;
  question: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  nullifierCount: number;
};
