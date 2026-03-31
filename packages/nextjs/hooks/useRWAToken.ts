"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Custom hook that bundles all RWAToken overview reads into one composable.
 *
 * @param address - Optional wallet address to also fetch balance & whitelist status
 * @returns Token metadata, supply info, pause state, and per-address data
 */
export interface UseRWATokenResult {
  /** ERC-20 token name */
  name: string | undefined;
  /** ERC-20 token symbol */
  symbol: string | undefined;
  /** Raw totalSupply (bigint, 18 decimals) */
  totalSupply: bigint | undefined;
  /** Human-readable total supply string (e.g. "1000000.0") */
  totalSupplyFormatted: string;
  /** Contract owner address */
  owner: string | undefined;
  /** Whether the contract is currently paused */
  paused: boolean | undefined;
  /** Balance of the given address (bigint, 18 decimals) — only when address is provided */
  balance: bigint | undefined;
  /** Human-readable balance string — only when address is provided */
  balanceFormatted: string;
  /** Whether the given address is whitelisted — only when address is provided */
  isWhitelisted: boolean | undefined;
  /** True while any of the underlying queries are still loading */
  isLoading: boolean;
  /** Refetch all underlying queries */
  refetchAll: () => void;
}

export const useRWAToken = (address?: string): UseRWATokenResult => {
  // ── Token metadata ────────────────────────────────────────────────
  const {
    data: name,
    isLoading: nameLoading,
    refetch: refetchName,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "name",
  });

  const {
    data: symbol,
    isLoading: symbolLoading,
    refetch: refetchSymbol,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "symbol",
  });

  // ── Supply & state ────────────────────────────────────────────────
  const {
    data: totalSupply,
    isLoading: supplyLoading,
    refetch: refetchSupply,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "totalSupply",
  });

  const {
    data: owner,
    isLoading: ownerLoading,
    refetch: refetchOwner,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "owner",
  });

  const {
    data: paused,
    isLoading: pausedLoading,
    refetch: refetchPaused,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "paused",
  });

  // ── Per-address data (only fetched when address is defined) ───────
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  const {
    data: isWhitelisted,
    isLoading: whitelistedLoading,
    refetch: refetchWhitelisted,
  } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isWhitelisted",
    args: [address],
    query: { enabled: !!address },
  });

  // ── Derived values ────────────────────────────────────────────────
  const totalSupplyFormatted = totalSupply !== undefined ? formatEther(totalSupply) : "0";
  const balanceFormatted = balance !== undefined ? formatEther(balance) : "0";

  const isLoading =
    nameLoading ||
    symbolLoading ||
    supplyLoading ||
    ownerLoading ||
    pausedLoading ||
    (!!address && (balanceLoading || whitelistedLoading));

  const refetchAll = () => {
    refetchName();
    refetchSymbol();
    refetchSupply();
    refetchOwner();
    refetchPaused();
    if (address) {
      refetchBalance();
      refetchWhitelisted();
    }
  };

  return {
    name,
    symbol,
    totalSupply,
    totalSupplyFormatted,
    owner,
    paused,
    balance,
    balanceFormatted,
    isWhitelisted,
    isLoading,
    refetchAll,
  };
};
