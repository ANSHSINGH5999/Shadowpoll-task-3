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
import { type ProofSupplyPrivateState } from "../witnesses.js";
import { inMemoryPrivateStateProvider } from "./inMemoryPrivateStateProvider.js";

export type ProofSupplyCircuitId = "registerCommitment" | "revokeCommitment" | "qualify";
export type ProofSupplyProviders = MidnightProviders<ProofSupplyCircuitId, PrivateStateId, ProofSupplyPrivateState>;

/**
 * Builds the providers ProofSupply needs to call its circuits, entirely by
 * delegating balancing, proving, and submission to the connected wallet.
 * Nothing here holds keys or generates proofs itself — the wallet does.
 *
 * @param connectedAPI The connected Midnight wallet (e.g. Lace).
 * @param zkConfigBaseURL Origin the compiled circuit's zkir/keys are served
 *   from (same-origin static assets in a web app; a CDN/host URL otherwise).
 */
export async function buildProofSupplyProviders(
  connectedAPI: ConnectedAPI,
  zkConfigBaseURL: string,
): Promise<ProofSupplyProviders> {
  const config = await connectedAPI.getConfiguration();
  const zkConfigProvider = new FetchZkConfigProvider<ProofSupplyCircuitId>(
    zkConfigBaseURL,
    typeof fetch === "function" ? fetch : undefined,
  );
  const provingProvider = await connectedAPI.getProvingProvider(zkConfigProvider);
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  return {
    privateStateProvider: inMemoryPrivateStateProvider<PrivateStateId, ProofSupplyPrivateState>(),
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
