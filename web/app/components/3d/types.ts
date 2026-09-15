/**
 * Visual state for the 3D privacy scene. Every value here corresponds to a
 * real, observable state of either the live indexer data or the real
 * wallet-connect + vote-submission flow (lib/wallet) — nothing is faked or
 * simulated for animation purposes.
 */
export type ShadowPollVisualState =
  | "loading"
  | "indexer-offline"
  | "wallet-disconnected"
  | "wallet-connecting"
  | "wallet-connected"
  | "processing"
  | "submitted"
  | "confirmed"
  | "already-voted"
  | "failed";

export type PublicPollState = {
  status: ShadowPollVisualState;
  question: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  nullifierCount: number;
};
