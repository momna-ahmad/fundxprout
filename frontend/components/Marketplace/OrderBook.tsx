// ── frontend/components/Marketplace/OrderBook.tsx ───────────────────────────────────────────────
'use client';
import { useMemo } from 'react';
import { useOrderBook } from '@/hooks/useOrderBook';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function OrderBook({ campaignId }: { campaignId: string }) {
  const { book, connected } = useOrderBook(campaignId);

  const topBids = useMemo(() => book.bids.slice(0, 5), [book.bids]);
  const topAsks = useMemo(() => book.asks.slice(0, 5), [book.asks]);

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Order Book</div>
          <div className="text-xs text-muted-foreground">Live bid / ask depth for this campaign</div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-chart-3' : 'bg-destructive'}`} />
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-background/80 p-3">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ArrowUpRight size={14} className="text-chart-3" />
            Bids
          </div>
          <div className="space-y-2">
            {topBids.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No bids yet</div>
            ) : (
              topBids.map((row, index) => (
                <div key={`${row.price}-${index}`} className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-sm text-foreground">
                  <span className="font-semibold">{row.quantity}</span>
                  <span className="text-muted-foreground">{row.price.toFixed(4)}</span>
                  <span className="text-right text-muted-foreground">{row.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 p-3">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ArrowDownRight size={14} className="text-destructive" />
            Asks
          </div>
          <div className="space-y-2">
            {topAsks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No asks yet</div>
            ) : (
              topAsks.map((row, index) => (
                <div key={`${row.price}-${index}`} className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-sm text-foreground">
                  <span className="font-semibold">{row.quantity}</span>
                  <span className="text-muted-foreground">{row.price.toFixed(4)}</span>
                  <span className="text-right text-muted-foreground">{row.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
