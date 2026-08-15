// ── frontend/components/Marketplace/ValuationChart.tsx ───────────────────────────────────────────────
'use client';
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

type Snapshot = {
  timestamp: string | number;
  value: number;
};

export default function ValuationChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = snapshots.map((item) => ({
    time: typeof item.timestamp === 'number'
      ? new Date(item.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.value,
  }));

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold text-foreground">Valuation Chart</div>
        <div className="text-xs text-muted-foreground">Historical campaign valuation snapshots</div>
      </div>
      {data.length === 0 ? (
        <div className="rounded-3xl border border-border/50 bg-background/80 px-4 py-14 text-center text-sm text-muted-foreground">
          No valuation history available.
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 5, left: -8, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--foreground)' }} />
              <Line type="monotone" dataKey="value" stroke="var(--chart-5)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
