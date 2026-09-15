import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { PrivateStateId } from "@midnight-ntwrk/midnight-js-types";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  CompiledProofSupplyContractContract,
  ledger,
  pureCircuits,
  type Policy,
  type QualificationReceipt,
} from "../index.js";
import { createIssuerPrivateState, createSupplierPrivateState } from "../witnesses.js";
import { buildProofSupplyProviders } from "./providers.js";

export const proofSupplyPrivateStateKey = "proofSupplyPrivateState" as PrivateStateId;

export type SupplierAttributes = {
  readonly capacity: bigint;
  readonly quality: bigint;
  readonly bidPrice: bigint;
  readonly leadTime: bigint;
  readonly jurisdiction: Uint8Array;
  readonly credentialSecret: Uint8Array;
  readonly nonce: Uint8Array;
};

export type QualificationProofResult = {
  readonly txHash: string;
  readonly nullifier: Uint8Array;
  readonly receipt: QualificationReceipt | undefined;
};

/**
 * Deploys a new ProofSupply contract instance, anchored to the given
 * issuer's secret key (never disclosed — only its hash goes on chain).
 * Balancing, proving, and submission are all delegated to the connected
 * wallet.
 */
export async function deployProofSupplyContract(
  connectedAPI: ConnectedAPI,
  options: { networkId: string; zkConfigBaseURL: string; issuerSecretKey: Uint8Array },
): Promise<{ contractAddress: ContractAddress; txHash: string }> {
  setNetworkId(options.networkId as Parameters<typeof setNetworkId>[0]);
  const providers = await buildProofSupplyProviders(connectedAPI, options.zkConfigBaseURL);

  const issuerCommitment = pureCircuits.issuerAuthorizationHash(options.issuerSecretKey);
  const initialPrivateState = createIssuerPrivateState(options.issuerSecretKey);

  const deployed = await deployContract(providers, {
    compiledContract: CompiledProofSupplyContractContract,
    args: [issuerCommitment],
    privateStateId: proofSupplyPrivateStateKey,
    initialPrivateState,
  });

  return {
    contractAddress: deployed.deployTxData.public.contractAddress,
    txHash: deployed.deployTxData.public.txHash,
  };
}

/**
 * Generates and submits a zero-knowledge qualification proof against an
 * already-deployed ProofSupply contract, entirely through the connected
 * wallet: the wallet holds the keys, builds the proof (via
 * `getProvingProvider`), signs, and submits. This function itself never
 * sees a private key, and the supplier's private attributes exist only in
 * this call's local witness context — never logged, never sent to any
 * server, never present in the returned result.
 *
 * @returns The transaction hash, the policy-scoped nullifier (public, but
 *   irreversible back to the supplier's identity), and the public
 *   qualification receipt — nothing about the supplier's actual attributes.
 */
export async function generateQualificationProof(
  connectedAPI: ConnectedAPI,
  options: {
    networkId: string;
    contractAddress: ContractAddress;
    zkConfigBaseURL: string;
    policy: Policy;
    supplierAttributes: SupplierAttributes;
  },
): Promise<QualificationProofResult> {
  setNetworkId(options.networkId as Parameters<typeof setNetworkId>[0]);
  const providers = await buildProofSupplyProviders(connectedAPI, options.zkConfigBaseURL);

  const initialPrivateState = createSupplierPrivateState(options.supplierAttributes);
  providers.privateStateProvider.setContractAddress(options.contractAddress);

  const deployedContract = await findDeployedContract(providers, {
    contractAddress: options.contractAddress,
    compiledContract: CompiledProofSupplyContractContract,
    privateStateId: proofSupplyPrivateStateKey,
    initialPrivateState,
  });

  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const txData = await deployedContract.callTx.qualify(options.policy, timestamp);

  // The nullifier is a pure, local (non-proof) computation — deriving it
  // here to look up the public receipt never touches the credential secret
  // beyond this process, and nothing here is logged.
  const nullifier = pureCircuits.policyNullifierHash(
    options.supplierAttributes.credentialSecret,
    options.policy.policyVersionId,
  );

  const contractState = await providers.publicDataProvider.queryContractState(options.contractAddress);
  const receipt = contractState ? ledger(contractState.data).qualificationReceipts.lookup(nullifier) : undefined;

  return { txHash: txData.public.txHash, nullifier, receipt };
}
