// Path in your project: components/admin/marketplace-trading-chart.tsx
"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface TradingPoint {
  trade_date: string;
  volume_usd: number;
  trade_count: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">
        {new Date(label).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
      <p className="text-white font-semibold">
        ${Number(payload[0].value).toLocaleString()} traded
      </p>
      <p className="text-gray-500">{payload[0].payload.trade_count} trades</p>
    </div>
  );
}

export default function MarketplaceTradingChart({ data }: { data: TradingPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        No secondary market activity yet.
      </div>
    );
  }

  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tradingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="trade_date"
            tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="volume_usd"
            stroke="#a78bfa"
            strokeWidth={2}
            fill="url(#tradingFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}