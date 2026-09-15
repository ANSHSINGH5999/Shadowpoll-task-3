import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { findDeployedContract, type FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { type PrivateStateId } from "@midnight-ntwrk/midnight-js-types";
import {
  CompiledShadowPollContractContract,
  createShadowPollPrivateState,
  type Contract as ShadowPollContractDef,
  type ShadowPollPrivateState,
} from "@shadowpoll/contract";
import { connectToWallet } from "./connect";
import { buildShadowPollProviders, type ShadowPollProviders } from "./providers";

// The underlying (non-Effect-wrapped) contract type, as declared by the
// compiled contract's own managed/ output — this is what generic bounds
// like FoundContract<C> actually expect, not the CompiledContract wrapper.
type ShadowPollContractType = ShadowPollContractDef<ShadowPollPrivateState>;

export const shadowPollPrivateStateKey = "shadowPollPrivateState" as PrivateStateId;

export type WalletConnectionState = "disconnected" | "connecting" | "connected" | "error";
export type VoteState = "idle" | "processing" | "submitted" | "confirmed" | "already-voted" | "failed";

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const ALREADY_VOTED_MESSAGE = "This voter has already cast a ballot in this poll";

/**
 * Owns the real connection to the browser's Midnight wallet extension and
 * the deployed ShadowPoll contract handle. Every state transition here
 * corresponds to something that actually happened — connecting to a real
 * wallet, generating a real proof (via the wallet), submitting a real
 * transaction.
 */
export class ShadowPollWalletManager {
  private connectedAPI: ConnectedAPI | null = null;
  private providers: ShadowPollProviders | null = null;
  private deployedContract: FoundContract<ShadowPollContractType> | null = null;

  async connect(networkId: string, contractAddress: string): Promise<{ address: string }> {
    setNetworkId(networkId as never);
    this.connectedAPI = await connectToWallet(networkId);
    this.providers = await buildShadowPollProviders(this.connectedAPI);

    this.providers.privateStateProvider.setContractAddress(contractAddress);
    const existing = await this.providers.privateStateProvider.get(shadowPollPrivateStateKey);
    const initialPrivateState: ShadowPollPrivateState = existing ?? createShadowPollPrivateState(randomBytes(32));

    this.deployedContract = await findDeployedContract(this.providers, {
      contractAddress,
      compiledContract: CompiledShadowPollContractContract,
      privateStateId: shadowPollPrivateStateKey,
      initialPrivateState,
    });

    const { shieldedAddress } = await this.connectedAPI.getShieldedAddresses();
    return { address: shieldedAddress };
  }

  async castVote(voteYes: boolean): Promise<{ txHash: string }> {
    if (!this.deployedContract) {
      throw new Error("Not connected to the ShadowPoll contract yet.");
    }
    try {
      const txData = await this.deployedContract.callTx.castVote(voteYes);
      return { txHash: txData.public.txHash };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(ALREADY_VOTED_MESSAGE)) {
        throw new AlreadyVotedError();
      }
      throw error;
    }
  }
}

export class AlreadyVotedError extends Error {
  constructor() {
    super(ALREADY_VOTED_MESSAGE);
    this.name = "AlreadyVotedError";
  }
}
