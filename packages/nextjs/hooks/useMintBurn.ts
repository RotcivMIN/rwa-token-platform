"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * Custom hook for mint & burn operations on the RWAToken contract.
 *
 * Writes – mint / burn (accepts human-readable amounts, converts to 18-decimal wei)
 * Events – TokensMinted + TokensBurned history
 */
export interface UseMintBurnResult {
  /**
   * Mint tokens to an address.
   * @param to    - Recipient address
   * @param amount - Human-readable amount (e.g. "1000")
   */
  mint: (to: string, amount: string) => Promise<void>;
  /**
   * Burn tokens from an address.
   * @param from   - Address to burn from
   * @param amount - Human-readable amount (e.g. "500")
   */
  burn: (from: string, amount: string) => Promise<void>;
  /** Whether a write tx is currently mining */
  isMining: boolean;
  /** Historical TokensMinted events (newest first) */
  mintEvents: any[] | undefined;
  /** Historical TokensBurned events (newest first) */
  burnEvents: any[] | undefined;
}

export const useMintBurn = (): UseMintBurnResult => {
  // ── Writes ────────────────────────────────────────────────────────
  const { writeContractAsync, isMining } = useScaffoldWriteContract("RWAToken");

  const mint = useCallback(
    async (to: string, amount: string) => {
      const weiAmount = parseEther(amount);
      await writeContractAsync({
        functionName: "mint",
        args: [to, weiAmount],
      });
    },
    [writeContractAsync],
  );

  const burn = useCallback(
    async (from: string, amount: string) => {
      const weiAmount = parseEther(amount);
      await writeContractAsync({
        functionName: "burn",
        args: [from, weiAmount],
      });
    },
    [writeContractAsync],
  );

  // ── Events ────────────────────────────────────────────────────────
  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensMinted",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  const { data: burnEvents } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensBurned",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  return {
    mint,
    burn,
    isMining,
    mintEvents,
    burnEvents,
  };
};
