'use client';

// components/Investor/SellerProceedsCard.tsx
// Displays the authenticated seller's completed token sale history and net proceeds.
//
// SECURITY NOTE:
// - This component calls GET /api/marketplace/seller/proceeds with the user's
//   Bearer JWT token. The backend NEVER accepts a userId param — it always
//   reads req.user.id from the verified JWT. So a logged-in user can only
//   ever see their own trades, even if they tamper with network requests.
// - No buyer wallet addresses, buyer IDs, or other PII are returned by the
//   backend endpoint or rendered here.

import { useEffect, useState } from 'react';
import {
  Loader2, TrendingUp, ExternalLink, AlertCircle,
  CircleDollarSign, BadgeCheck, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getSellerProceeds, type SellerTrade, type SellerProceedsResponse } from '@/lib/marketplace-api';
import { getEthPrice } from '@/utils/getEthPrice';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

function formatEth(val: number) {
  return val.toFixed(6).replace(/\.?0+$/, '') + ' ETH';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function SellerProceedsCard() {
  const [data, setData] = useState<SellerProceedsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch proceeds and ETH price in parallel
      const [proceeds, usdPrice] = await Promise.all([
        getSellerProceeds(),
        getEthPrice().catch(() => null),
      ]);
      setData(proceeds);
      setEthUsd(usdPrice);
    } catch (err: any) {
      setError(err.message || 'Could not load sales proceeds.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // If seller has no completed trades, render nothing (keep the UI clean)
  if (!loading && !error && data?.tradeCount === 0) return null;

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--chart-3) 15%, transparent)' }}
          >
            <CircleDollarSign size={18} style={{ color: 'var(--chart-3)' }} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Sales Proceeds</p>
            <p className="text-xs text-muted-foreground">Auto-deposited to your wallet on-chain</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-deposited badge */}
          <span
            className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold"
            style={{
              color: 'var(--chart-3)',
              background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--chart-3) 25%, transparent)',
            }}
          >
            <BadgeCheck size={10} />
            Auto-Deposited ✓
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-xl hover:bg-muted/40 disabled:opacity-50"
            title="Refresh"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading your sales proceeds…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-6 text-sm text-destructive">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : data ? (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60">
            {/* Total Earned */}
            <div className="flex flex-col gap-0.5 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Earned
              </span>
              <span className="text-xl font-bold text-foreground">
                {formatEth(data.totalEarned)}
              </span>
              {ethUsd && (
                <span className="text-xs text-muted-foreground">
                  ≈ ${(data.totalEarned * ethUsd).toFixed(2)} USD
                </span>
              )}
            </div>

            {/* Platform Fee */}
            <div className="flex flex-col gap-0.5 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Platform Fee (2%)
              </span>
              <span className="text-xl font-bold text-muted-foreground">
                {formatEth(data.totalFees)}
              </span>
              {ethUsd && (
                <span className="text-xs text-muted-foreground">
                  ≈ ${(data.totalFees * ethUsd).toFixed(2)} USD
                </span>
              )}
            </div>

            {/* Completed Trades */}
            <div className="flex flex-col gap-0.5 p-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Completed Trades
              </span>
              <span className="text-xl font-bold text-foreground">{data.tradeCount}</span>
              <span className="text-xs text-muted-foreground">all settled on-chain</span>
            </div>
          </div>

          {/* ── Info banner ── */}
          <div
            className="flex items-start gap-2 px-5 py-3 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--chart-3) 6%, transparent)',
              color: 'color-mix(in srgb, var(--chart-3) 80%, var(--foreground))',
            }}
          >
            <TrendingUp size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              ETH proceeds were sent directly to your wallet address in the same on-chain transaction.
              No manual withdrawal is needed. Click <strong>View on Sepolia Etherscan</strong> per trade for cryptographic proof.
            </span>
          </div>

          {/* ── Trade History (collapsible) ── */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-5 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition border-t border-border/60"
          >
            <span>Trade History ({data.tradeCount})</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="border-t border-border/40 bg-background/40">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <span>Campaign</span>
                <span>Tokens</span>
                <span>Price/Token</span>
                <span>Net Earned</span>
                <span>Proof</span>
              </div>

              <div className="flex flex-col divide-y divide-border/30">
                {data.trades.map((trade: SellerTrade) => (
                  <div
                    key={trade.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-3.5 hover:bg-muted/10 transition"
                  >
                    {/* Campaign */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {trade.campaignTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(trade.executedAt)}</p>
                    </div>

                    {/* Tokens sold */}
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {trade.quantity}
                    </span>

                    {/* Price per token */}
                    <span className="text-sm font-medium text-muted-foreground tabular-nums">
                      {trade.price} ETH
                    </span>

                    {/* Net earned */}
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: 'var(--chart-3)' }}
                    >
                      {formatEth(trade.earned)}
                    </span>

                    {/* Etherscan proof link */}
                    {trade.txHash ? (
                      <a
                        href={`${ETHERSCAN_BASE}${trade.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-ring hover:text-foreground transition"
                        title={`View tx ${trade.txHash} on Sepolia Etherscan`}
                      >
                        <ExternalLink size={11} />
                        Etherscan
                      </a>
                    ) : (
                      <span className="rounded-xl border border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground/50">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
