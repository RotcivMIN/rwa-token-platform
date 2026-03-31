"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, zeroAddress } from "viem";
import { hardhat } from "viem/chains";
import { useScaffoldEventHistory, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

// ─── Types ───────────────────────────────────────────────
type TabKey = "all" | "transfers" | "blocked" | "mints" | "burns";

interface UnifiedEvent {
  type: "transfer" | "blocked" | "mint" | "burn";
  blockNumber: bigint;
  transactionHash: string;
  from: string | undefined;
  to: string | undefined;
  amount: bigint | undefined;
  detail: string;
}

// ─── Blocked TX Detail Sub-component ─────────────────────
// Reads a single blocked transaction by index from on-chain storage.
function BlockedTxRow({ index }: { index: number }) {
  const { targetNetwork } = useTargetNetwork();
  const { data, isLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getBlockedTransaction",
    args: [BigInt(index)],
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="text-center">
          <span className="loading loading-dots loading-xs"></span>
        </td>
      </tr>
    );
  }

  if (!data) return null;

  // data is a tuple: [from, to, amount, reason, timestamp]
  const [from, to, amount, reason, timestamp] = data as [string, string, bigint, string, bigint];

  return (
    <tr className="hover">
      <td className="font-mono text-xs">{index}</td>
      <td>
        <Address
          address={from}
          size="sm"
          onlyEnsOrAddress
          blockExplorerAddressLink={targetNetwork.id === hardhat.id ? `/blockexplorer/address/${from}` : undefined}
        />
      </td>
      <td>
        <Address
          address={to}
          size="sm"
          onlyEnsOrAddress
          blockExplorerAddressLink={targetNetwork.id === hardhat.id ? `/blockexplorer/address/${to}` : undefined}
        />
      </td>
      <td className="font-mono">{Number(formatEther(amount)).toLocaleString()}</td>
      <td>
        <span className="badge badge-error badge-sm">{reason}</span>
      </td>
      <td className="text-xs opacity-70">{new Date(Number(timestamp) * 1000).toLocaleString()}</td>
    </tr>
  );
}

// ─── Main Page ───────────────────────────────────────────
const TransactionLog: NextPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [blockedDetailOpen, setBlockedDetailOpen] = useState(false);
  const { targetNetwork } = useTargetNetwork();

  // ── Event Histories ──────────────────────────────────
  const { data: transferEvents, isLoading: loadingTransfers } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "Transfer",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  const { data: blockedEvents, isLoading: loadingBlocked } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TransactionBlocked",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  const { data: mintEvents, isLoading: loadingMints } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensMinted",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  const { data: burnEvents, isLoading: loadingBurns } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensBurned",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  // ── On-chain blocked tx count (for detail section) ───
  const { data: blockedTxCount } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getBlockedTransactionCount",
  });

  const isLoading = loadingTransfers || loadingBlocked || loadingMints || loadingBurns;

  // ── Build unified event list ─────────────────────────
  const unifiedEvents: UnifiedEvent[] = [];

  // Transfers — filter out mint (from==0x0) and burn (to==0x0)
  (transferEvents ?? []).forEach(e => {
    const from = e.args?.from as string | undefined;
    const to = e.args?.to as string | undefined;
    const value = e.args?.value as bigint | undefined;
    const isMint = from === zeroAddress;
    const isBurn = to === zeroAddress;
    if (!isMint && !isBurn) {
      unifiedEvents.push({
        type: "transfer",
        blockNumber: e.blockNumber ?? 0n,
        transactionHash: (e.transactionHash as string) ?? "",
        from,
        to,
        amount: value,
        detail: "Transfer",
      });
    }
  });

  // Blocked
  (blockedEvents ?? []).forEach(e => {
    unifiedEvents.push({
      type: "blocked",
      blockNumber: e.blockNumber ?? 0n,
      transactionHash: (e.transactionHash as string) ?? "",
      from: e.args?.from as string | undefined,
      to: e.args?.to as string | undefined,
      amount: undefined,
      detail: (e.args?.reason as string) ?? "Blocked",
    });
  });

  // Mints
  (mintEvents ?? []).forEach(e => {
    unifiedEvents.push({
      type: "mint",
      blockNumber: e.blockNumber ?? 0n,
      transactionHash: (e.transactionHash as string) ?? "",
      from: undefined,
      to: e.args?.to as string | undefined,
      amount: e.args?.amount as bigint | undefined,
      detail: (e.args?.reason as string) ?? "Minting",
    });
  });

  // Burns
  (burnEvents ?? []).forEach(e => {
    unifiedEvents.push({
      type: "burn",
      blockNumber: e.blockNumber ?? 0n,
      transactionHash: (e.transactionHash as string) ?? "",
      from: e.args?.from as string | undefined,
      to: undefined,
      amount: e.args?.amount as bigint | undefined,
      detail: (e.args?.reason as string) ?? "Burning",
    });
  });

  // Sort by block number descending (newest first)
  unifiedEvents.sort((a, b) => {
    if (b.blockNumber > a.blockNumber) return 1;
    if (b.blockNumber < a.blockNumber) return -1;
    return 0;
  });

  // ── Filter by active tab ─────────────────────────────
  const filteredEvents =
    activeTab === "all"
      ? unifiedEvents
      : unifiedEvents.filter(e => e.type === (activeTab.replace(/s$/, "") as UnifiedEvent["type"]));

  // ── Stat counts ──────────────────────────────────────
  const counts = {
    transfers: unifiedEvents.filter(e => e.type === "transfer").length,
    blocked: unifiedEvents.filter(e => e.type === "blocked").length,
    mints: unifiedEvents.filter(e => e.type === "mint").length,
    burns: unifiedEvents.filter(e => e.type === "burn").length,
  };

  // ── Helpers ──────────────────────────────────────────
  const badgeClass: Record<UnifiedEvent["type"], string> = {
    transfer: "badge badge-info",
    blocked: "badge badge-error",
    mint: "badge badge-success",
    burn: "badge badge-warning",
  };

  const typeIcon: Record<UnifiedEvent["type"], string> = {
    transfer: "💸",
    blocked: "🚫",
    mint: "🪙",
    burn: "🔥",
  };

  const typeLabel: Record<UnifiedEvent["type"], string> = {
    transfer: "Transfer",
    blocked: "Blocked",
    mint: "Mint",
    burn: "Burn",
  };

  // Tab definitions
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "transfers", label: "Transfers", count: counts.transfers },
    { key: "blocked", label: "Blocked", count: counts.blocked },
    { key: "mints", label: "Mints", count: counts.mints },
    { key: "burns", label: "Burns", count: counts.burns },
  ];

  // Blocked tx count (on-chain)
  const blockedCount = blockedTxCount !== undefined ? Number(blockedTxCount) : 0;

  return (
    <div className="flex flex-col items-center grow pt-10 px-4 pb-12">
      {/* ── Page Title ──────────────────────────────────── */}
      <h1 className="text-3xl font-bold mb-6">📋 Transaction Log</h1>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="stats stats-vertical lg:stats-horizontal shadow mb-8 w-full max-w-3xl">
        <div className="stat">
          <div className="stat-figure text-info">💸</div>
          <div className="stat-title">Transfers</div>
          <div className="stat-value text-info">{isLoading ? "…" : counts.transfers}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-error">🚫</div>
          <div className="stat-title">Blocked</div>
          <div className="stat-value text-error">{isLoading ? "…" : counts.blocked}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">🪙</div>
          <div className="stat-title">Mints</div>
          <div className="stat-value text-success">{isLoading ? "…" : counts.mints}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">🔥</div>
          <div className="stat-title">Burns</div>
          <div className="stat-value text-warning">{isLoading ? "…" : counts.burns}</div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────── */}
      <div role="tablist" className="tabs tabs-boxed mb-6 w-full max-w-3xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            className={`tab ${activeTab === tab.key ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="badge badge-sm ml-1">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Event Table ─────────────────────────────────── */}
      <div className="w-full max-w-5xl overflow-x-auto shadow-xl rounded-xl mb-10">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 bg-base-100 rounded-xl">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="ml-4 text-lg">Loading events…</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 bg-base-100 rounded-xl">
            <span className="text-4xl mb-3">📭</span>
            <span className="text-lg opacity-60">No events found</span>
          </div>
        ) : (
          <table className="table table-zebra bg-base-100 w-full">
            <thead>
              <tr className="text-sm text-base-content">
                <th className="bg-primary text-primary-content">Type</th>
                <th className="bg-primary text-primary-content">Block</th>
                <th className="bg-primary text-primary-content">From</th>
                <th className="bg-primary text-primary-content">To</th>
                <th className="bg-primary text-primary-content text-right">Amount (RWAG)</th>
                <th className="bg-primary text-primary-content">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt, idx) => (
                <tr key={`${evt.transactionHash}-${evt.type}-${idx}`} className="hover">
                  {/* Type badge */}
                  <td>
                    <span className={badgeClass[evt.type] + " gap-1"}>
                      <span>{typeIcon[evt.type]}</span>
                      <span className="hidden sm:inline">{typeLabel[evt.type]}</span>
                    </span>
                  </td>

                  {/* Block number */}
                  <td className="font-mono text-sm">{evt.blockNumber.toString()}</td>

                  {/* From */}
                  <td>
                    {evt.from ? (
                      <Address
                        address={evt.from}
                        size="sm"
                        onlyEnsOrAddress
                        blockExplorerAddressLink={
                          targetNetwork.id === hardhat.id ? `/blockexplorer/address/${evt.from}` : undefined
                        }
                      />
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>

                  {/* To */}
                  <td>
                    {evt.to ? (
                      <Address
                        address={evt.to}
                        size="sm"
                        onlyEnsOrAddress
                        blockExplorerAddressLink={
                          targetNetwork.id === hardhat.id ? `/blockexplorer/address/${evt.to}` : undefined
                        }
                      />
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="text-right font-mono">
                    {evt.amount !== undefined ? Number(formatEther(evt.amount)).toLocaleString() : "—"}
                  </td>

                  {/* Detail / Reason */}
                  <td className="text-sm max-w-[200px] truncate" title={evt.detail}>
                    {evt.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Blocked Transactions On-Chain Detail ────────── */}
      <div className="w-full max-w-5xl">
        <div className="collapse collapse-arrow bg-base-200 shadow-lg rounded-xl">
          <input
            type="checkbox"
            checked={blockedDetailOpen}
            onChange={() => setBlockedDetailOpen(!blockedDetailOpen)}
          />
          <div className="collapse-title text-lg font-semibold flex items-center gap-2">
            🚫 Blocked Transactions — On-Chain Records
            <span className="badge badge-error badge-sm">{blockedCount}</span>
          </div>
          <div className="collapse-content">
            {blockedCount === 0 ? (
              <div className="text-center py-8 opacity-60">
                <span className="text-3xl block mb-2">✅</span>
                No blocked transactions recorded on-chain
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="text-sm">
                      <th>#</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount (RWAG)</th>
                      <th>Reason</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: blockedCount }, (_, i) => (
                      <BlockedTxRow key={i} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionLog;
