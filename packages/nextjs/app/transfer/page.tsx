"use client";

import { useState } from "react";
import { Address, AddressInput, EtherInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/** Format a bigint token amount (18 decimals) to a human-readable string with commas */
const fmtToken = (raw: bigint | undefined): string => {
  if (raw === undefined) return "—";
  const num = Number(formatEther(raw));
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const TransferPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  // ── Read hooks ──────────────────────────────────────────────────
  const { data: tokenSymbol } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "symbol" });
  const { data: myBalance } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "balanceOf",
    args: [connectedAddress],
  });
  const { data: whitelistedAddresses } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getWhitelistedAddresses",
  });
  const { data: isConnectedWhitelisted } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isWhitelisted",
    args: [connectedAddress],
  });

  // ── Local state ─────────────────────────────────────────────────
  const [toAddr, setToAddr] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [useTryTransfer, setUseTryTransfer] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const symbol = tokenSymbol ?? "RWAG";

  // ── Handlers ────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!toAddr || !amount) return;
    setLastResult(null);
    try {
      if (useTryTransfer) {
        await writeContractAsync({
          functionName: "tryTransfer",
          args: [toAddr as `0x${string}`, parseEther(amount)],
        });
        setLastResult({ success: true, message: "tryTransfer submitted — check Transactions page for result" });
      } else {
        await writeContractAsync({
          functionName: "transfer",
          args: [toAddr as `0x${string}`, parseEther(amount)],
        });
        setLastResult({ success: true, message: `Successfully transferred ${amount} ${symbol}` });
      }
      setToAddr("");
      setAmount("");
    } catch (e: any) {
      console.error("transfer failed:", e);
      setLastResult({ success: false, message: e?.shortMessage || e?.message || "Transfer failed" });
    }
  };

  const handleSelectWhitelisted = (addr: string) => {
    setToAddr(addr);
  };

  const Spinner = () => <span className="loading loading-spinner loading-sm" />;

  return (
    <div className="flex flex-col grow px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
      {/* ── Title ─────────────────────────────────────────────── */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">💸 Transfer Tokens</h1>
      <p className="text-base opacity-70 mb-8">Send {symbol} to any whitelisted wallet</p>

      {/* ── Your wallet info ───────────────────────────────────── */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">👛 Your Wallet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-70">Connected Address</p>
              {connectedAddress ? (
                <Address address={connectedAddress} />
              ) : (
                <p className="italic opacity-60">Not connected</p>
              )}
            </div>
            <div>
              <p className="text-sm opacity-70">Your Balance</p>
              <p className="text-xl font-bold">
                {connectedAddress ? fmtToken(myBalance) : "—"} {symbol}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-70">Whitelist Status</p>
              {connectedAddress ? (
                <span className={`badge ${isConnectedWhitelisted ? "badge-success" : "badge-error"} badge-lg`}>
                  {isConnectedWhitelisted ? "✅ Whitelisted" : "❌ Not Whitelisted"}
                </span>
              ) : (
                <span className="badge badge-ghost badge-lg">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* ── Transfer Form ───────────────────────────────────── */}
        <div className="lg:col-span-2 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">📤 Send Tokens</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium opacity-70 mb-1 block">Recipient Address</label>
                <AddressInput
                  value={toAddr}
                  onChange={(v: string) => setToAddr(v)}
                  placeholder="0x... or select from whitelist →"
                />
              </div>
              <div>
                <label className="text-sm font-medium opacity-70 mb-1 block">Amount ({symbol})</label>
                <EtherInput
                  placeholder={`Amount in ${symbol}`}
                  onValueChange={({ valueInEth }) => setAmount(valueInEth)}
                />
              </div>

              {/* ── Transfer mode toggle ────────────────────────── */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={useTryTransfer}
                    onChange={e => setUseTryTransfer(e.target.checked)}
                  />
                  <span className="label-text text-sm">
                    Use <code className="font-mono bg-base-200 px-1 rounded">tryTransfer</code> (soft-fail — won&apos;t
                    revert, records blocked TX)
                  </span>
                </label>
              </div>

              <button
                className="btn btn-primary w-full mt-1"
                onClick={handleTransfer}
                disabled={isMining || !toAddr || !amount || !connectedAddress}
              >
                {isMining ? <Spinner /> : `💸 ${useTryTransfer ? "Try Transfer" : "Transfer"} ${symbol}`}
              </button>
            </div>

            {/* ── Result feedback ─────────────────────────────── */}
            {lastResult && (
              <div className={`alert ${lastResult.success ? "alert-success" : "alert-error"} mt-4 shadow-sm`}>
                <span>
                  {lastResult.success ? "✅" : "❌"} {lastResult.message}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Whitelist quick-select ──────────────────────────── */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">📋 Select from Whitelist</h2>
            <p className="text-sm opacity-60 mb-2">Click an address to auto-fill the recipient</p>
            {whitelistedAddresses === undefined ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (whitelistedAddresses as readonly `0x${string}`[]).length === 0 ? (
              <p className="text-sm opacity-60 py-4">No whitelisted addresses.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(whitelistedAddresses as readonly `0x${string}`[]).map((addr, idx) => (
                  <button
                    key={addr}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-colors text-left ${
                      toAddr.toLowerCase() === addr.toLowerCase() ? "bg-primary/20 ring-2 ring-primary" : "bg-base-200"
                    }`}
                    onClick={() => handleSelectWhitelisted(addr)}
                  >
                    <span className="text-xs font-mono opacity-50">{idx + 1}.</span>
                    <Address address={addr} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Info card ──────────────────────────────────────────── */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body py-4">
          <h3 className="font-semibold text-sm">ℹ️ Transfer vs tryTransfer</h3>
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th></th>
                  <th>transfer()</th>
                  <th>tryTransfer()</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>On failure</td>
                  <td>Reverts (cancels TX)</td>
                  <td>Returns false (TX recorded)</td>
                </tr>
                <tr>
                  <td>Gas on failure</td>
                  <td>Refunded</td>
                  <td>Consumed</td>
                </tr>
                <tr>
                  <td>Audit trail</td>
                  <td>No record</td>
                  <td>TransactionBlocked event</td>
                </tr>
                <tr>
                  <td>Best for</td>
                  <td>Normal transfers</td>
                  <td>Batch / compliance testing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferPage;
