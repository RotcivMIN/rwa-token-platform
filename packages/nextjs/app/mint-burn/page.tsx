"use client";

import { useState } from "react";
import { Address, AddressInput, EtherInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/** Format a bigint token amount (18 decimals) to a human-readable string with commas */
const fmtToken = (raw: bigint | undefined): string => {
  if (raw === undefined) return "—";
  const num = Number(formatEther(raw));
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const MintBurnPanel: NextPage = () => {
  // ── Write hook ──────────────────────────────────────────────────
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  // ── Read hooks ──────────────────────────────────────────────────
  const { data: totalSupply } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "totalSupply" });
  const { data: tokenSymbol } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "symbol" });
  const { data: paused } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "paused" });

  // ── Event histories ─────────────────────────────────────────────
  const { data: mintEvents, isLoading: mintEventsLoading } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensMinted",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });
  const { data: burnEvents, isLoading: burnEventsLoading } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "TokensBurned",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  // ── Local state ─────────────────────────────────────────────────
  const [mintAddr, setMintAddr] = useState<string>("");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [burnAddr, setBurnAddr] = useState<string>("");
  const [burnAmount, setBurnAmount] = useState<string>("");

  // ── Handlers ────────────────────────────────────────────────────
  const handleMint = async () => {
    if (!mintAddr || !mintAmount) return;
    try {
      await writeContractAsync({
        functionName: "mint",
        args: [mintAddr as `0x${string}`, parseEther(mintAmount)],
      });
      setMintAddr("");
      setMintAmount("");
    } catch (e) {
      console.error("mint failed:", e);
    }
  };

  const handleBurn = async () => {
    if (!burnAddr || !burnAmount) return;
    try {
      await writeContractAsync({
        functionName: "burn",
        args: [burnAddr as `0x${string}`, parseEther(burnAmount)],
      });
      setBurnAddr("");
      setBurnAmount("");
    } catch (e) {
      console.error("burn failed:", e);
    }
  };

  const handlePause = async () => {
    try {
      await writeContractAsync({ functionName: "pause" });
    } catch (e) {
      console.error("pause failed:", e);
    }
  };

  const handleUnpause = async () => {
    try {
      await writeContractAsync({ functionName: "unpause" });
    } catch (e) {
      console.error("unpause failed:", e);
    }
  };

  // ── Spinner helper ──────────────────────────────────────────────
  const Spinner = () => <span className="loading loading-spinner loading-sm" />;

  // ── Merge & sort events for unified timeline ────────────────────
  type EventItem = { type: "mint" | "burn"; to?: `0x${string}`; from?: `0x${string}`; amount?: bigint; key: string };
  const allEvents: EventItem[] = [];

  if (mintEvents) {
    for (const ev of mintEvents) {
      const args = ev.args as { to?: `0x${string}`; amount?: bigint } | undefined;
      allEvents.push({
        type: "mint",
        to: args?.to,
        amount: args?.amount,
        key: `mint-${ev.transactionHash}-${ev.logIndex}`,
      });
    }
  }
  if (burnEvents) {
    for (const ev of burnEvents) {
      const args = ev.args as { from?: `0x${string}`; amount?: bigint } | undefined;
      allEvents.push({
        type: "burn",
        from: args?.from,
        amount: args?.amount,
        key: `burn-${ev.transactionHash}-${ev.logIndex}`,
      });
    }
  }

  const symbol = tokenSymbol ?? "RWAG";

  return (
    <div className="flex flex-col grow px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
      {/* ── Title ─────────────────────────────────────────────── */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">🔥 Mint &amp; Burn Panel</h1>
      <p className="text-base opacity-70 mb-8">
        Total Supply: <span className="font-bold">{totalSupply !== undefined ? fmtToken(totalSupply) : "..."}</span>{" "}
        {symbol}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* ── Mint Tokens ──────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">🪙 Mint Tokens</h2>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium opacity-70">To Address</label>
              <AddressInput value={mintAddr} onChange={(v: string) => setMintAddr(v)} placeholder="Recipient address" />
              <label className="text-sm font-medium opacity-70">Amount ({symbol})</label>
              <EtherInput
                placeholder={`Amount in ${symbol}`}
                onValueChange={({ valueInEth }) => setMintAmount(valueInEth)}
              />
              <button
                className="btn btn-primary w-full mt-2"
                onClick={handleMint}
                disabled={isMining || !mintAddr || !mintAmount}
              >
                {isMining ? <Spinner /> : "🪙 Mint Tokens"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Burn Tokens ──────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">🔥 Burn Tokens</h2>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium opacity-70">From Address</label>
              <AddressInput
                value={burnAddr}
                onChange={(v: string) => setBurnAddr(v)}
                placeholder="Address to burn from"
              />
              <label className="text-sm font-medium opacity-70">Amount ({symbol})</label>
              <EtherInput
                placeholder={`Amount in ${symbol}`}
                onValueChange={({ valueInEth }) => setBurnAmount(valueInEth)}
              />
              <button
                className="btn btn-error w-full mt-2"
                onClick={handleBurn}
                disabled={isMining || !burnAddr || !burnAmount}
              >
                {isMining ? <Spinner /> : "🔥 Burn Tokens"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pause Control ──────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl mb-10">
        <div className="card-body">
          <h2 className="card-title text-lg">⏯️ Pause Control</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium opacity-70">Status:</span>
              {paused !== undefined ? (
                <span className={`badge ${paused ? "badge-error" : "badge-success"} badge-lg`}>
                  {paused ? "⏸️ Paused" : "✅ Active"}
                </span>
              ) : (
                <Spinner />
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-warning btn-sm" onClick={handlePause} disabled={isMining || paused === true}>
                {isMining ? <Spinner /> : "⏸️ Pause"}
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={handleUnpause}
                disabled={isMining || paused === false}
              >
                {isMining ? <Spinner /> : "▶️ Unpause"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Mint / Burn Events ──────────────────────────── */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">📜 Recent Mint / Burn Events</h2>
          {mintEventsLoading || burnEventsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : allEvents.length === 0 ? (
            <p className="text-sm opacity-60 py-4">No mint or burn events found.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {allEvents.slice(0, 30).map(ev => (
                <div
                  key={ev.key}
                  className={`flex flex-wrap items-center gap-2 p-2 rounded-lg ${
                    ev.type === "mint" ? "bg-success/10" : "bg-error/10"
                  }`}
                >
                  <span className="text-lg">{ev.type === "mint" ? "🪙" : "🔥"}</span>
                  <span className="font-semibold text-sm">
                    {ev.type === "mint" ? "Minted" : "Burned"} {ev.amount !== undefined ? fmtToken(ev.amount) : "?"}{" "}
                    {symbol}
                  </span>
                  <span className="text-sm opacity-70">{ev.type === "mint" ? "to" : "from"}</span>
                  <Address address={ev.type === "mint" ? ev.to : ev.from} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MintBurnPanel;
