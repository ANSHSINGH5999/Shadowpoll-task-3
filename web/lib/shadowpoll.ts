import "server-only";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { ledger } from "@shadowpoll/contract/shadow_poll";

export const NETWORK = "preprod" as const;
export const CONTRACT_ADDRESS =
  process.env.SHADOWPOLL_CONTRACT_ADDRESS ??
  "9e59284468387b6422d83ce78cc08220337d307e19007063fcc9dd3a10e7cdbd";
export const DEPLOY_TX_HASH =
  "0b59d6ae48a56b82d78cc6f49648c0d7164d78f680ccd9da77c1247a2d7d3330";
export const DEPLOY_BLOCK = 2748475;

const INDEXER_URL = "https://indexer.preprod.midnight.network/api/v4/graphql";

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
 * straight from the public Midnight Preprod indexer, and decodes it with the
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
