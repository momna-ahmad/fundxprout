"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Area, AreaChart,
} from "recharts";
import { Loader2 } from "lucide-react";
import { getMarketAnalytics, MarketAnalyticsData } from "@/lib/analytics";

const DONUT_COLORS = ["#a78bfa", "#6f42c1", "#7c3aed", "#4c1d95"];
const BAR_RAISED = "#a78bfa";
const BAR_BACKERS = "#6f42c1";
const LINE_RAISED = "#a78bfa";
const LINE_CAMPAIGNS = "#28a745";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const AXIS_COLOR = "#6b7280";
const TOOLTIP_STYLE = {
  backgroundColor: "#1e2530",
  border: "1px solid rgba(111,66,193,0.4)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 12,
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2 shadow-xl">
      {label && <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs font-semibold">
          {p.name}: {p.value}{p.name === "raised" || p.name === "ETH Raised" ? " ETH" : ""}
        </p>
      ))}
    </div>
  );
}

export default function MarketAnalytics() {
  const [data, setData] = useState<MarketAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getMarketAnalytics();
        setData(result);
      } catch (err) {
        console.error("Failed to load market analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = [
    { label: "Total Raised", value: data?.stats.totalRaisedEth ?? "0.00 ETH", sub: "Platform life-to-date" },
    { label: "Active Campaigns", value: data?.stats.activeCampaigns?.toLocaleString() ?? "0", sub: "Open for investment" },
    { label: "Total Backers", value: data?.stats.totalBackers?.toLocaleString() ?? "0", sub: "Unique investors" },
    { label: "Success Rate", value: data?.stats.successRate ?? "0.0%", sub: "Campaigns meeting goal" },
  ];

  if (loading) {
    return (
      <section className="bg-[#181A2A] py-16 px-4 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#a78bfa] mb-3" />
        <p className="text-sm text-gray-400">Loading dynamic market metrics...</p>
      </section>
    );
  }

  return (
    <section className="bg-[#181A2A] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Platform Analytics</p>
          <h2 className="text-2xl font-black text-white">
            Crowdfunding <span className="text-[#a78bfa]">Market Insights</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">Live platform metrics — updated in real time</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[#1e2530] border border-white/5 rounded-2xl p-5 hover:border-[#6f42c1]/40 transition-all duration-200"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-[#a78bfa] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Row 1: Donut + Monthly Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Donut — Campaign Type Split */}
          <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
            <p className="text-sm font-bold text-white mb-1">Campaign Type Distribution</p>
            <p className="text-xs text-gray-400 mb-4">Share of total campaigns by funding model</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data?.campaignStatusData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(data?.campaignStatusData || []).map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div style={TOOLTIP_STYLE} className="px-3 py-2">
                        <p className="text-xs text-gray-300">{d.name}</p>
                        <p style={{ color: d.payload.fill }} className="text-sm font-bold">{d.value}%</p>
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <text x="50%" y="43%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 800, fill: "#fff" }}>
                  {data?.stats.activeCampaigns ?? 0}
                </text>
                <text x="50%" y="52%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fill: "#9ca3af" }}>
                  active
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart — Monthly Platform Growth */}
          <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
            <p className="text-sm font-bold text-white mb-1">Monthly Platform Growth</p>
            <p className="text-xs text-gray-400 mb-4">ETH raised &amp; campaigns launched over the past 12 months</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.monthlyGrowth || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRaised" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LINE_RAISED} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={LINE_RAISED} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCampaigns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LINE_CAMPAIGNS} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={LINE_CAMPAIGNS} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Area type="monotone" dataKey="raised" name="ETH Raised" stroke={LINE_RAISED} strokeWidth={2} fill="url(#gradRaised)" dot={false} />
                <Area type="monotone" dataKey="campaigns" name="Campaigns" stroke={LINE_CAMPAIGNS} strokeWidth={2} fill="url(#gradCampaigns)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Grouped Bar — Category Breakdown */}
        <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
          <p className="text-sm font-bold text-white mb-1">Funding by Category</p>
          <p className="text-xs text-gray-400 mb-4">ETH raised and total backers per campaign category</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.categoryData || []} barGap={4} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="category" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(111,66,193,0.08)" }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Bar yAxisId="left" dataKey="raised" name="ETH Raised" fill={BAR_RAISED} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar yAxisId="right" dataKey="backers" name="Backers" fill={BAR_BACKERS} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}