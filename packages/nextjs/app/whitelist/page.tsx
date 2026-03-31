"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const WhitelistManager: NextPage = () => {
  // ── Write hook ──────────────────────────────────────────────────
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  // ── Read hooks ──────────────────────────────────────────────────
  const { data: whitelistCount } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistCount",
  });
  const { data: whitelistedAddresses } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistedAddresses",
  });

  // ── Event history ───────────────────────────────────────────────
  const { data: whitelistEvents, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "WhitelistUpdated",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  // ── Local state ─────────────────────────────────────────────────
  const [addAddr, setAddAddr] = useState<string>("");
  const [removeAddr, setRemoveAddr] = useState<string>("");
  const [checkAddr, setCheckAddr] = useState<string>("");

  // ── Check whitelist status for a specific address ───────────────
  const { data: isWhitelisted } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isWhitelisted",
    args: [checkAddr as `0x${string}`],
  });

  // ── Handlers ────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addAddr) return;
    try {
      await writeContractAsync({ functionName: "addToWhitelist", args: [addAddr as `0x${string}`] });
      setAddAddr("");
    } catch (e) {
      console.error("addToWhitelist failed:", e);
    }
  };

  const handleRemove = async (addr?: string) => {
    const target = addr || removeAddr;
    if (!target) return;
    try {
      await writeContractAsync({ functionName: "removeFromWhitelist", args: [target as `0x${string}`] });
      if (!addr) setRemoveAddr("");
    } catch (e) {
      console.error("removeFromWhitelist failed:", e);
    }
  };

  // ── Spinner helper ──────────────────────────────────────────────
  const Spinner = () => <span className="loading loading-spinner loading-sm" />;

  return (
    <div className="flex flex-col grow px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
      {/* ── Title ─────────────────────────────────────────────── */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">🛡️ Whitelist Manager</h1>
      <p className="text-base opacity-70 mb-8">
        Current Count:{" "}
        <span className="font-bold">{whitelistCount !== undefined ? whitelistCount.toString() : "..."}</span>{" "}
        whitelisted addresses
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* ── Add to Whitelist ──────────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">➕ Add to Whitelist</h2>
            <div className="flex flex-col gap-3">
              <AddressInput value={addAddr} onChange={(v: string) => setAddAddr(v)} placeholder="Address to add" />
              <button className="btn btn-success w-full" onClick={handleAdd} disabled={isMining || !addAddr}>
                {isMining ? <Spinner /> : "Add ✅"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Remove from Whitelist ─────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">➖ Remove from Whitelist</h2>
            <div className="flex flex-col gap-3">
              <AddressInput
                value={removeAddr}
                onChange={(v: string) => setRemoveAddr(v)}
                placeholder="Address to remove"
              />
              <button
                className="btn btn-error w-full"
                onClick={() => handleRemove()}
                disabled={isMining || !removeAddr}
              >
                {isMining ? <Spinner /> : "Remove ❌"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Check Whitelist Status ─────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl mb-10">
        <div className="card-body">
          <h2 className="card-title text-lg">🔍 Check Whitelist Status</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <AddressInput
                value={checkAddr}
                onChange={(v: string) => setCheckAddr(v)}
                placeholder="Address to check"
              />
            </div>
          </div>
          {checkAddr && checkAddr.length === 42 && (
            <div className="mt-3">
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

      {/* ── Current Whitelist Table ────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl mb-10">
        <div className="card-body">
          <h2 className="card-title text-lg">📋 Current Whitelist</h2>
          {whitelistedAddresses === undefined ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : whitelistedAddresses.length === 0 ? (
            <p className="text-sm opacity-60 py-4">No addresses whitelisted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(whitelistedAddresses as readonly `0x${string}`[]).map((addr, idx) => (
                    <tr key={addr}>
                      <td className="font-mono">{idx + 1}</td>
                      <td>
                        <Address address={addr} />
                      </td>
                      <td>
                        <button className="btn btn-error btn-xs" onClick={() => handleRemove(addr)} disabled={isMining}>
                          {isMining ? <Spinner /> : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Events ──────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">📜 Recent Whitelist Events</h2>
          {eventsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !whitelistEvents || whitelistEvents.length === 0 ? (
            <p className="text-sm opacity-60 py-4">No events found.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {whitelistEvents.slice(0, 20).map((event, idx) => {
                const args = event.args as { account?: `0x${string}`; isAdded?: boolean } | undefined;
                const isAdded = args?.isAdded;
                return (
                  <div
                    key={`${event.transactionHash}-${event.logIndex}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg ${isAdded ? "bg-success/10" : "bg-error/10"}`}
                  >
                    <span className="text-lg">{isAdded ? "🟢" : "🔴"}</span>
                    <Address address={args?.account} size="sm" />
                    <span className="text-sm opacity-70">
                      {isAdded ? "added to whitelist" : "removed from whitelist"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhitelistManager;
