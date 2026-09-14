/*
 * Defines the shape of a voter's private state and the single witness
 * function the ShadowPoll contract needs: the voter's secret key. That key
 * never leaves this process in the clear — only the one-way nullifier
 * derived from it (via the `voteNullifier` circuit, behind `disclose()`)
 * ever reaches the public ledger.
 */

import { Ledger } from "./managed/shadow_poll/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type ShadowPollPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createShadowPollPrivateState = (
  secretKey: Uint8Array,
): ShadowPollPrivateState => ({ secretKey });

export const witnesses = {
  voterSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, ShadowPollPrivateState>): [
    ShadowPollPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
