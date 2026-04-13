"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const AdminManager: NextPage = () => {
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  // ── Local state ─────────────────────────────────────────────────
  const [addAddr, setAddAddr] = useState<string>("");
  const [removeAddr, setRemoveAddr] = useState<string>("");
  const [checkAddr, setCheckAddr] = useState<string>("");

  // ── Check admin status ──────────────────────────────────────────
  const { data: isAdminResult } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isAdmin",
    args: [checkAddr as `0x${string}`],
  });

  // ── Event history ───────────────────────────────────────────────
  const { data: adminEvents, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "AdminUpdated",
    fromBlock: 10518100n,
    blocksBatchSize: 100000,
  });

  // ── Handlers ────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addAddr) return;
    try {
      await writeContractAsync({ functionName: "addAdmin", args: [addAddr as `0x${string}`] });
      setAddAddr("");
    } catch (e) {
      console.error("addAdmin failed:", e);
    }
  };

  const handleRemove = async () => {
    if (!removeAddr) return;
    try {
      await writeContractAsync({ functionName: "removeAdmin", args: [removeAddr as `0x${string}`] });
      setRemoveAddr("");
    } catch (e) {
      console.error("removeAdmin failed:", e);
    }
  };

  const Spinner = () => <span className="loading loading-spinner loading-sm" />;

  return (
    <div className="flex flex-col grow px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">👑 Admin Manager</h1>
      <p className="text-base opacity-70 mb-8">
        Manage administrator privileges. Only the contract <span className="font-bold">Owner</span> can add or remove
        admins. Admins can whitelist, mint, burn, and pause.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* ── Add Admin ──────────────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">➕ Add Admin</h2>
            <p className="text-sm opacity-60 mb-2">Address will also be auto-whitelisted</p>
            <div className="flex flex-col gap-3">
              <AddressInput
                value={addAddr}
                onChange={(v: string) => setAddAddr(v)}
                placeholder="Address to grant admin"
              />
              <button className="btn btn-success w-full" onClick={handleAdd} disabled={isMining || !addAddr}>
                {isMining ? <Spinner /> : "Grant Admin ✅"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Remove Admin ───────────────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">➖ Remove Admin</h2>
            <p className="text-sm opacity-60 mb-2">Revokes admin rights (whitelist status kept)</p>
            <div className="flex flex-col gap-3">
              <AddressInput
                value={removeAddr}
                onChange={(v: string) => setRemoveAddr(v)}
                placeholder="Address to revoke admin"
              />
              <button className="btn btn-error w-full" onClick={handleRemove} disabled={isMining || !removeAddr}>
                {isMining ? <Spinner /> : "Revoke Admin ❌"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Check Admin Status ──────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl mb-10">
        <div className="card-body">
          <h2 className="card-title text-lg">🔍 Check Admin Status</h2>
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
              {isAdminResult !== undefined ? (
                <div className={`alert ${isAdminResult ? "alert-success" : "alert-warning"} shadow-sm`}>
                  <span>{isAdminResult ? "✅ This address IS an admin" : "❌ This address is NOT an admin"}</span>
                </div>
              ) : (
                <Spinner />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Admin Events ─────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-lg">📜 Recent Admin Events</h2>
          {eventsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !adminEvents || adminEvents.length === 0 ? (
            <p className="text-sm opacity-60 py-4">No admin events found.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {adminEvents.slice(0, 20).map((event, idx) => {
                const args = event.args as { account?: `0x${string}`; status?: boolean } | undefined;
                const isAdded = args?.status;
                return (
                  <div
                    key={`${event.transactionHash}-${event.logIndex}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg ${isAdded ? "bg-success/10" : "bg-error/10"}`}
                  >
                    <span className="text-lg">{isAdded ? "👑" : "🚫"}</span>
                    <Address address={args?.account} size="sm" />
                    <span className="text-sm opacity-70">{isAdded ? "granted admin" : "admin revoked"}</span>
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

export default AdminManager;
