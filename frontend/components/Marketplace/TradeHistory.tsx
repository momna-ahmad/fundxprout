// ── frontend/components/Marketplace/TradeHistory.tsx ───────────────────────────────────────────────
'use client';
import { Clock, ArrowRight } from 'lucide-react';
import { TradeEvent } from '@/hooks/useOrderBook';

export default function TradeHistory({ trades }: { trades: TradeEvent[] }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Recent Trades</div>
          <div className="text-xs text-muted-foreground">Latest executions on this campaign</div>
        </div>
        <ArrowRight size={16} className="text-muted-foreground" />
      </div>

      <div className="space-y-3">
        {trades.length === 0 ? (
          <div className="rounded-3xl border border-border/50 bg-background/80 px-4 py-6 text-center text-sm text-muted-foreground">
            No recent trades available.
          </div>
        ) : (
          trades.map((trade) => (
            <div key={trade.id} className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-foreground">
                <div className="font-semibold">{trade.side.toUpperCase()} {trade.quantity} @ {trade.price.toFixed(4)}</div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trade.side === 'buy' ? 'bg-chart-3/10 text-chart-3' : 'bg-destructive/10 text-destructive'}`}>
                  {trade.side}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <div>{trade.buyer ? `Buyer ${trade.buyer.slice(0, 6)}…` : 'Buyer unknown'}</div>
                <div className="flex items-center gap-1"><Clock size={12} />{trade.timestamp ?? 'just now'}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
