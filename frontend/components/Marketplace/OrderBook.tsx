'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Radio } from 'lucide-react';
import { useOrderBook, type OrderBookEntry } from '@/hooks/useOrderBook';

const VISIBLE_ROWS = 5;
const ROW_HEIGHT_PX = 40;

function formatAmount(value: number) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/* ------------------------------------------------------------------ */
/*  One side of the book (bids or asks)                                */
/* ------------------------------------------------------------------ */
function OrderColumn({
  title,
  entries,
  side,
}: {
  title: string;
  entries: OrderBookEntry[];
  side: 'bid' | 'ask';
}) {
  const isBid = side === 'bid';
  const accent = isBid ? 'text-emerald-400' : 'text-rose-400';
  const border = isBid ? 'border-emerald-500/20' : 'border-rose-500/20';
  const tint = isBid ? 'bg-emerald-500/[0.06]' : 'bg-rose-500/[0.06]';
  const depth = isBid ? 'bg-emerald-500/15' : 'bg-rose-500/15';
  const icon = isBid ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />;

  // Depth bars are scaled against the largest order on this side.
  const maxTotal = useMemo(
    () => entries.reduce((max, e) => Math.max(max, Number(e.total) || 0), 0),
    [entries]
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background/50">
      {/* Column header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-md border ${border} ${tint} ${accent}`}
          >
            {icon}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-none text-foreground">{title}</h3>
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">
              {isBid ? 'Buy offers' : 'Sell offers'}
            </p>
          </div>
        </div>
        <span
          className={`rounded border ${border} ${tint} px-2 py-0.5 text-xs font-medium tabular-nums ${accent}`}
        >
          {entries.length} active
        </span>
      </div>

      {/* Table head */}
      <div className="grid grid-cols-3 gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium text-muted-foreground">
        <span>Price (ETH)</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Total (ETH)</span>
      </div>

      {/* Rows */}
      <div style={{ minHeight: VISIBLE_ROWS * ROW_HEIGHT_PX }}>
        {entries.length === 0 ? (
          <div
            className="flex items-center justify-center px-4 text-center text-sm text-muted-foreground"
            style={{ height: VISIBLE_ROWS * ROW_HEIGHT_PX }}
          >
            No {isBid ? 'bids' : 'asks'} available yet
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {entries.map((entry, index) => {
              const widthPct =
                maxTotal > 0 ? Math.max(((Number(entry.total) || 0) / maxTotal) * 100, 4) : 0;
              const isBest = index === 0;

              return (
                <li
                  key={entry.id || `${entry.price}-${entry.created_at || index}`}
                  className="relative grid grid-cols-3 items-center gap-3 px-4 text-sm transition-colors hover:bg-card/80"
                  style={{ height: ROW_HEIGHT_PX }}
                >
                  {/* Depth bar */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 right-0 ${depth}`}
                    style={{ width: `${widthPct}%` }}
                  />
                  {isBest && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-0.5 ${isBid ? 'bg-emerald-400' : 'bg-rose-400'}`}
                    />
                  )}

                  <span
                    className={`relative flex items-center gap-1.5 font-semibold tabular-nums ${accent}`}
                  >
                    {formatAmount(entry.price)}
                    {isBest && (
                      <span
                        className={`rounded border ${border} px-1 py-px text-[9px] font-semibold leading-none`}
                      >
                        Best
                      </span>
                    )}
                  </span>
                  <span className="relative text-right font-medium tabular-nums text-foreground">
                    {formatAmount(entry.quantity)}
                  </span>
                  <span className="relative text-right font-medium tabular-nums text-foreground">
                    {formatAmount(entry.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Order book                                                         */
/* ------------------------------------------------------------------ */
export default function OrderBook({ campaignId }: { campaignId: string }) {
  const { book, connected } = useOrderBook(campaignId);
  const topBids = useMemo(() => book.bids.slice(0, 5), [book.bids]);
  const topAsks = useMemo(() => book.asks.slice(0, 5), [book.asks]);

  const bestBid = topBids[0] ? Number(topBids[0].price) : null;
  const bestAsk = topAsks[0] ? Number(topAsks[0].price) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Order book</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live buy and sell interest for this campaign
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Radio size={13} className={connected ? 'text-emerald-400' : 'text-muted-foreground'} />
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-muted-foreground/50'}`}
          />
          {connected ? 'Live market data' : 'Reconnecting'}
        </span>
      </div>

      {/* Market summary */}
      <dl className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-4 py-3 sm:px-5">
          <dt className="text-xs text-muted-foreground">Best bid</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-emerald-400">
            {bestBid !== null ? `${formatAmount(bestBid)} ETH` : '—'}
          </dd>
        </div>
        <div className="px-4 py-3 sm:px-5">
          <dt className="text-xs text-muted-foreground">Best ask</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-rose-400">
            {bestAsk !== null ? `${formatAmount(bestAsk)} ETH` : '—'}
          </dd>
        </div>
      </dl>

      {/* Bids / asks */}
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
        <OrderColumn title="Bids" entries={topBids} side="bid" />
        <OrderColumn title="Asks" entries={topAsks} side="ask" />
      </div>
    </div>
  );
}
