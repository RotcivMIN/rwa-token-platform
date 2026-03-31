"use client";

import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Custom hook for transaction history & blocked-transaction monitoring on RWAToken.
 *
 * Reads  – blockedTxCount
 * Events – Transfer (ERC-20) + TransactionBlocked history
 */
export interface UseTransactionLogResult {
  /** Total number of blocked transactions recorded on-chain */
  blockedTxCount: bigint | undefined;
  /** Historical ERC-20 Transfer events (newest first) */
  transferEvents: any[] | undefined;
  /** Historical TransactionBlocked events (newest first) */
  blockedEvents: any[] | undefined;
  /** True while the blockedTxCount read is loading */
  isLoading: boolean;
}

export const useTransactionLog = (): UseTransactionLogResult => {
  // ── Reads ─────────────────────────────────────────────────────────
  const { data: blockedTxCount, isLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getBlockedTransactionCount",
  });

  // ── Events ────────────────────────────────────────────────────────
  const { data: transferEvents } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "Transfer",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  const { data: blockedEvents } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TransactionBlocked",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  return {
    blockedTxCount,
    transferEvents,
    blockedEvents,
    isLoading,
  };
};
