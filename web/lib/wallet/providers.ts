import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  createProofProvider,
  type MidnightProviders,
  type PrivateStateId,
  type UnboundTransaction,
} from "@midnight-ntwrk/midnight-js-types";
import { toHex, fromHex } from "@midnight-ntwrk/midnight-js-utils";
import {
  Transaction,
  type SignatureEnabled,
  type Proof,
  type Binding,
  type FinalizedTransaction,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { type ShadowPollPrivateState } from "@shadowpoll/contract";
import { localStoragePrivateStateProvider } from "./localStoragePrivateStateProvider";

export type ShadowPollProviders = MidnightProviders<"castVote", PrivateStateId, ShadowPollPrivateState>;

/**
 * Builds the providers ShadowPoll needs to call `castVote`, entirely by
 * delegating balancing, proving, and submission to the connected wallet.
 * Nothing here holds keys or generates proofs itself — the wallet does that.
 */
export async function buildShadowPollProviders(connectedAPI: ConnectedAPI): Promise<ShadowPollProviders> {
  const config = await connectedAPI.getConfiguration();
  const zkConfigProvider = new FetchZkConfigProvider<"castVote">(window.location.origin, window.fetch.bind(window));
  const provingProvider = await connectedAPI.getProvingProvider(zkConfigProvider);
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  return {
    privateStateProvider: localStoragePrivateStateProvider<PrivateStateId, ShadowPollPrivateState>(),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    zkConfigProvider,
    proofProvider: createProofProvider(provingProvider),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const { tx: balancedHex } = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          "signature",
          "proof",
          "binding",
          fromHex(balancedHex),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<string> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}
