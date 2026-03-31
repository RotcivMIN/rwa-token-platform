"use client";

import { useCallback } from "react";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * Custom hook for whitelist management on the RWAToken contract.
 *
 * Reads  – whitelist count, full address list, per-address check
 * Writes – add / remove from whitelist
 * Events – WhitelistUpdated history
 */
export interface UseWhitelistResult {
  /** Total number of whitelisted addresses */
  whitelistCount: bigint | undefined;
  /** Array of all currently whitelisted addresses */
  whitelistedAddresses: readonly string[] | undefined;
  /** Whether the queried address is whitelisted (only if checkAddress provided) */
  isWhitelisted: boolean | undefined;
  /** Add an address to the whitelist (owner only) */
  addToWhitelist: (addr: string) => Promise<void>;
  /** Remove an address from the whitelist (owner only) */
  removeFromWhitelist: (addr: string) => Promise<void>;
  /** Whether a write tx is currently mining */
  isMining: boolean;
  /** Historical WhitelistUpdated events (newest first) */
  whitelistEvents: any[] | undefined;
  /** True while reads are loading */
  isLoading: boolean;
}

export const useWhitelist = (checkAddress?: string): UseWhitelistResult => {
  // ── Reads ─────────────────────────────────────────────────────────
  const { data: whitelistCount, isLoading: countLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistCount",
  });

  const { data: whitelistedAddresses, isLoading: addressesLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistedAddresses",
  });

  const { data: isWhitelisted, isLoading: whitelistedLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isWhitelisted",
    args: [checkAddress],
    query: { enabled: !!checkAddress },
  });

  // ── Writes ────────────────────────────────────────────────────────
  const { writeContractAsync, isMining } = useScaffoldWriteContract("RWAToken");

  const addToWhitelist = useCallback(
    async (addr: string) => {
      await writeContractAsync({
        functionName: "addToWhitelist",
        args: [addr],
      });
    },
    [writeContractAsync],
  );

  const removeFromWhitelist = useCallback(
    async (addr: string) => {
      await writeContractAsync({
        functionName: "removeFromWhitelist",
        args: [addr],
      });
    },
    [writeContractAsync],
  );

  // ── Events ────────────────────────────────────────────────────────
  const { data: whitelistEvents } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "WhitelistUpdated",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  // ── Derived ───────────────────────────────────────────────────────
  const isLoading = countLoading || addressesLoading || (!!checkAddress && whitelistedLoading);

  return {
    whitelistCount,
    whitelistedAddresses,
    isWhitelisted,
    addToWhitelist,
    removeFromWhitelist,
    isMining,
    whitelistEvents,
    isLoading,
  };
};
