import "server-only";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { ledger } from "@shadowpoll/contract/shadow_poll";

export const NETWORK = "preview" as const;
export const CONTRACT_ADDRESS =
  process.env.SHADOWPOLL_CONTRACT_ADDRESS ??
  "af9cf4341fe405b0d4967f969b4fc9271fee80f317e54ac84761971406f95cd4";
export const DEPLOY_TX_HASH =
  "52ecc1066affa226e60e8578e20971a7d7842fba4c42921eccfe65e42287a024";
export const DEPLOY_BLOCK = 868378;

const INDEXER_URL = "https://indexer.preview.midnight.network/api/v4/graphql";

export type PollSnapshot = {
  question: string;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  nullifierCount: number;
  fetchedAt: string;
};

const QUERY = `
  query ShadowPollState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

/**
 * Fetches the current on-chain state of the deployed ShadowPoll contract
 * straight from the public Midnight Preview indexer, and decodes it with the
 * same `ledger()` function the compiled contract exports. No caching layer
 * of our own beyond Next's fetch cache — this is live chain data.
 */
export async function getPollSnapshot(): Promise<PollSnapshot> {
  const res = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { address: CONTRACT_ADDRESS } }),
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    throw new Error(`Indexer request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const stateHex: string | undefined = json?.data?.contractAction?.state;
  if (!stateHex) {
    throw new Error("Contract state not found on indexer");
  }

  const bytes = Uint8Array.from(Buffer.from(stateHex, "hex"));
  const contractState = ContractState.deserialize(bytes);
  const ledgerState = ledger(contractState.data);

  const yesVotes = Number(ledgerState.yesVotes);
  const noVotes = Number(ledgerState.noVotes);

  return {
    question: ledgerState.question,
    yesVotes,
    noVotes,
    totalVotes: yesVotes + noVotes,
    nullifierCount: Number(ledgerState.nullifiers.size()),
    fetchedAt: new Date().toISOString(),
  };
}
