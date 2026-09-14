import { describe, it, expect } from "vitest";
import { ShadowPollSimulator } from "./shadow-poll-simulator.js";
import { randomBytes } from "./utils.js";

describe("ShadowPoll smart contract", () => {
  it("generates initial ledger state deterministically for the same question", () => {
    const key = randomBytes(32);
    const simulator0 = new ShadowPollSimulator(key, "Ship the new moon milestone?");
    const simulator1 = new ShadowPollSimulator(key, "Ship the new moon milestone?");
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("initializes the poll question and empty tallies", () => {
    const simulator = new ShadowPollSimulator(randomBytes(32), "Ship it?");
    const ledgerState = simulator.getLedger();
    expect(ledgerState.question).toEqual("Ship it?");
    expect(ledgerState.yesVotes).toEqual(0n);
    expect(ledgerState.noVotes).toEqual(0n);
    expect(ledgerState.nullifiers.isEmpty()).toEqual(true);
  });

  it("counts a yes vote and records the voter's nullifier", () => {
    const key = randomBytes(32);
    const simulator = new ShadowPollSimulator(key, "Ship it?");
    simulator.castVote(true);
    const ledgerState = simulator.getLedger();
    expect(ledgerState.yesVotes).toEqual(1n);
    expect(ledgerState.noVotes).toEqual(0n);
    expect(ledgerState.nullifiers.member(simulator.nullifierFor(key))).toEqual(true);
  });

  it("counts a no vote", () => {
    const simulator = new ShadowPollSimulator(randomBytes(32), "Ship it?");
    simulator.castVote(false);
    const ledgerState = simulator.getLedger();
    expect(ledgerState.yesVotes).toEqual(0n);
    expect(ledgerState.noVotes).toEqual(1n);
  });

  it("lets different voters each cast one ballot", () => {
    const simulator = new ShadowPollSimulator(randomBytes(32), "Ship it?");
    simulator.castVote(true);
    simulator.switchVoter(randomBytes(32));
    simulator.castVote(true);
    simulator.switchVoter(randomBytes(32));
    simulator.castVote(false);
    const ledgerState = simulator.getLedger();
    expect(ledgerState.yesVotes).toEqual(2n);
    expect(ledgerState.noVotes).toEqual(1n);
    expect(ledgerState.nullifiers.size()).toEqual(3n);
  });

  it("never reveals the voter's secret key on the public ledger", () => {
    const key = randomBytes(32);
    const simulator = new ShadowPollSimulator(key, "Ship it?");
    simulator.castVote(true);
    const ledgerState = simulator.getLedger();
    for (const nullifier of ledgerState.nullifiers) {
      expect(nullifier).not.toEqual(key);
    }
  });

  it("does not let the same voter double-vote", () => {
    const simulator = new ShadowPollSimulator(randomBytes(32), "Ship it?");
    simulator.castVote(true);
    expect(() => simulator.castVote(false)).toThrow(
      "This voter has already cast a ballot in this poll",
    );
  });

  it("does not let the same voter double-vote even with the same choice", () => {
    const simulator = new ShadowPollSimulator(randomBytes(32), "Ship it?");
    simulator.castVote(true);
    expect(() => simulator.castVote(true)).toThrow(
      "This voter has already cast a ballot in this poll",
    );
  });
});
