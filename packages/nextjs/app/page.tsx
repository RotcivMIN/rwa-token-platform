"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/** Format a bigint token amount (18 decimals) to a human-readable string with commas */
const fmtToken = (raw: bigint | undefined): string => {
  if (raw === undefined) return "—";
  const num = Number(formatEther(raw));
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

/** Single row showing one wallet's balance — isolated component to follow React hooks rules */
const WalletBalanceRow = ({
  addr,
  idx,
  totalSupply,
}: {
  addr: `0x${string}`;
  idx: number;
  totalSupply: bigint | undefined;
}) => {
  const { data: balance } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "balanceOf",
    args: [addr],
  });

  const pct =
    balance !== undefined && totalSupply && totalSupply > 0n
      ? ((Number(formatEther(balance)) / Number(formatEther(totalSupply))) * 100).toFixed(1)
      : "—";

  return (
    <tr>
      <td className="font-mono text-xs">{idx + 1}</td>
      <td>
        <Address address={addr} size="sm" />
      </td>
      <td className="text-right font-mono">{fmtToken(balance)}</td>
      <td className="text-right font-mono">{pct}%</td>
      <td>
        {balance !== undefined && totalSupply && totalSupply > 0n && (
          <progress
            className="progress progress-primary w-24"
            value={Number(formatEther(balance))}
            max={Number(formatEther(totalSupply))}
          />
        )}
      </td>
    </tr>
  );
};

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  // ── Contract reads ──────────────────────────────────────────────
  const { data: tokenName } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "name" });
  const { data: tokenSymbol } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "symbol" });
  const { data: totalSupply } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "totalSupply" });
  const { data: owner } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "owner" });
  const { data: paused } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "paused" });
  const { data: whitelistCount } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistCount",
  });
  const { data: blockedTxCount } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getBlockedTransactionCount",
  });
  const { data: whitelistedAddresses } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistedAddresses",
  });
  const { data: myBalance } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  // ── Whitelist check ─────────────────────────────────────────────
  const [checkAddr, setCheckAddr] = useState<string>("");
  const { data: isWhitelisted } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isWhitelisted",
    args: [checkAddr as `0x${string}`],
  });

  // ── Small loading helper ────────────────────────────────────────
  const Spinner = () => <span className="loading loading-spinner loading-sm" />;

  return (
    <div className="flex flex-col grow px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
      {/* ── Title ─────────────────────────────────────────────── */}
      <h1 className="text-3xl md:text-4xl font-bold mb-8 flex items-center gap-3">
        🏦 {tokenName ?? "RWA Token"} ({tokenSymbol ?? "..."}) Dashboard
      </h1>

      {/* ── Stat cards — Row 1 ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Total Supply */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Total Supply</h2>
            <p className="text-2xl font-bold">{totalSupply !== undefined ? fmtToken(totalSupply) : <Spinner />}</p>
            <p className="text-xs opacity-50">{tokenSymbol ?? "RWAG"}</p>
          </div>
        </div>

        {/* Whitelist Count */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Whitelist Count</h2>
            <p className="text-2xl font-bold">
              {whitelistCount !== undefined ? whitelistCount.toString() : <Spinner />}
            </p>
            <p className="text-xs opacity-50">Approved addresses</p>
          </div>
        </div>

        {/* Blocked Tx Count */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Blocked Transactions</h2>
            <p className="text-2xl font-bold">
              {blockedTxCount !== undefined ? blockedTxCount.toString() : <Spinner />}
            </p>
            <p className="text-xs opacity-50">Rejected transfers</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards — Row 2 ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Contract Owner */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Contract Owner</h2>
            {owner ? <Address address={owner} /> : <Spinner />}
          </div>
        </div>

        {/* Your Balance */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Your Balance</h2>
            {connectedAddress ? (
              <p className="text-2xl font-bold">{myBalance !== undefined ? fmtToken(myBalance) : <Spinner />}</p>
            ) : (
              <p className="text-sm italic opacity-60">Connect wallet to view</p>
            )}
            <p className="text-xs opacity-50">{tokenSymbol ?? "RWAG"}</p>
          </div>
        </div>

        {/* Paused Status */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">Contract Status</h2>
            {paused !== undefined ? (
              <div className="flex items-center gap-2">
                <span className={`badge ${paused ? "badge-error" : "badge-success"} badge-lg`}>
                  {paused ? "⏸️ Paused" : "✅ Active"}
                </span>
              </div>
            ) : (
              <Spinner />
            )}
          </div>
        </div>
      </div>

      {/* ── Token Distribution across Wallets ──────────────── */}
      <div className="card bg-base-100 shadow-xl mb-10">
        <div className="card-body">
          <h2 className="card-title text-lg">📊 Token Distribution across Wallets</h2>
          <p className="text-sm opacity-60 mb-2">Balance of each whitelisted wallet and its share of total supply</p>
          {whitelistedAddresses === undefined ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (whitelistedAddresses as readonly `0x${string}`[]).length === 0 ? (
            <p className="text-sm opacity-60 py-4">No whitelisted addresses yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Wallet</th>
                    <th className="text-right">Balance ({tokenSymbol ?? "RWAG"})</th>
                    <th className="text-right">Share</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {(whitelistedAddresses as readonly `0x${string}`[]).map((addr, idx) => (
                    <WalletBalanceRow key={addr} addr={addr} idx={idx} totalSupply={totalSupply} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────── */}
      <div className="divider text-lg font-semibold">Quick Actions</div>

      {/* ── Whitelist status checker ──────────────────────────── */}
      <div className="card bg-base-100 shadow-xl max-w-xl mx-auto w-full">
        <div className="card-body">
          <h2 className="card-title">🔍 Check Whitelist Status</h2>
          <p className="text-sm opacity-70 mb-2">Enter an address to check whether it is whitelisted.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <AddressInput
                value={checkAddr}
                onChange={(v: string) => setCheckAddr(v)}
                placeholder="0x... or ENS name"
              />
            </div>
          </div>

          {/* Result */}
          {checkAddr && checkAddr.length === 42 && (
            <div className="mt-4">
              {isWhitelisted !== undefined ? (
                <div className={`alert ${isWhitelisted ? "alert-success" : "alert-warning"} shadow-sm`}>
                  <span>{isWhitelisted ? "✅ This address IS whitelisted" : "❌ This address is NOT whitelisted"}</span>
                </div>
              ) : (
                <Spinner />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
