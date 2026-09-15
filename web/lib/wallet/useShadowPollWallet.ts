"use client";

import { useCallback, useRef, useState } from "react";
import { ShadowPollWalletManager, AlreadyVotedError, type VoteState, type WalletConnectionState } from "./manager";

export function useShadowPollWallet(networkId: string, contractAddress: string) {
  const managerRef = useRef<ShadowPollWalletManager | null>(null);
  const [walletState, setWalletState] = useState<WalletConnectionState>("disconnected");
  const [voteState, setVoteState] = useState<VoteState>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new ShadowPollWalletManager();
    }
    return managerRef.current;
  }, []);

  const connect = useCallback(async () => {
    setWalletState("connecting");
    setErrorMessage(null);
    try {
      const { address } = await getManager().connect(networkId, contractAddress);
      setAddress(address);
      setWalletState("connected");
    } catch (error) {
      setWalletState("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect to wallet.");
    }
  }, [getManager, networkId, contractAddress]);

  const castVote = useCallback(
    async (voteYes: boolean) => {
      if (walletState !== "connected") return;
      setVoteState("processing");
      setErrorMessage(null);
      try {
        const { txHash } = await getManager().castVote(voteYes);
        setLastTxHash(txHash);
        setVoteState("submitted");
        // The indexer needs a moment to index the transaction before the
        // dashboard's next revalidation picks it up; "confirmed" here means
        // "the wallet successfully submitted it", not "the indexer has it yet".
        setTimeout(() => setVoteState("confirmed"), 1500);
      } catch (error) {
        if (error instanceof AlreadyVotedError) {
          setVoteState("already-voted");
        } else {
          setVoteState("failed");
          setErrorMessage(error instanceof Error ? error.message : "Failed to submit vote.");
        }
      }
    },
    [getManager, walletState],
  );

  return { walletState, voteState, address, errorMessage, lastTxHash, connect, castVote };
}
