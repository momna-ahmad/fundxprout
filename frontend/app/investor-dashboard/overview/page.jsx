// frontend/app/investor-dashboard/overview/page.jsx
"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp, Coins, Briefcase, DollarSign, ArrowUpRight,
  ArrowDownRight, ExternalLink, Wallet,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { getUserPortfolioData, generatePortfolioTimeSeries } from "@/utils/supabase/getPortfolio";

// ── Helpers ──────────────────────────────────────────────────────────
const formatCurrency = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const formatNumber  = (v) => new Intl.NumberFormat("en-US").format(v);
const formatPercent = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;
const truncateHash  = (h) => `${h.slice(0, 8)}…${h.slice(-6)}`;
const formatDate    = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const COLORS = ["#6f42c1", "#a78bfa", "#5a3599", "#7c5cbf", "#c4b5fd", "#3d1f8a"];

// ── Sub-components ───────────────────────────────────────────────────
function Badge({ children, color = "purple" }) {
  const cls = {
    green:  "bg-green-500/10  text-green-400  border-green-500/20",
    red:    "bg-red-500/10    text-red-400    border-red-500/20",
    amber:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    purple: "bg-[#6f42c1]/15  text-[#a78bfa]  border-[#6f42c1]/25",
  };
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls[color] ?? cls.purple}`}>
      {children}
    </span>
  );
}

function Progress({ value }) {
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] transition-[width] duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[#6f42c1]/30 rounded-xl px-3.5 py-2.5">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className="text-[15px] font-bold text-[#a78bfa]">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function DashboardPage() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserPortfolioData().then((data) => {
      setPortfolioData(data);
      setLoading(false);
    });
  }, []);

  // Derive values
  const totalInvested      = portfolioData?.totalInvested      ?? 0;
  const totalInvestedEth   = portfolioData?.totalInvestedEth   ?? 0;
  const portfolioValue     = portfolioData?.portfolioValue     ?? 0;
  const portfolioValueEth  = portfolioData?.portfolioValueEth  ?? 0;
  const totalTokens        = portfolioData?.totalTokens        ?? 0;
  const investmentCount    = portfolioData?.investmentCount    ?? 0;
  const portfolioChange    = portfolioData?.portfolioChange    ?? 0;
  const portfolioChangePct = portfolioData?.portfolioChangePercent ?? 0;
  const walletAddress      = portfolioData?.walletAddress      ?? null;
  const investments        = portfolioData?.investments        ?? [];
  const topCampaignData    = portfolioData?.topCampaign        ?? null;

  // Derive live ETH→USD rate from the two values already in portfolio data
  const ethPrice = totalInvestedEth > 0 ? totalInvested / totalInvestedEth : 3000;

  // Portfolio history from real investments
  const portfolioHistory = investments.length > 0
    ? generatePortfolioTimeSeries(investments)
    : [{ month: "—", value: 0 }];

  // Build per-campaign token allocation for donut chart
  const tokenAllocData = investments.reduce((acc, inv) => {
    const camp = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
    const name  = camp?.title?.split(" ")[0] ?? "Unknown";
    const value = parseFloat(inv.amount || "0") || 0;
    const existing = acc.find((a) => a.name === name);
    if (existing) { existing.value += value; }
    else { acc.push({ name, value, color: COLORS[acc.length % COLORS.length] }); }
    return acc;
  }, []);

  // Recent transactions built from investments
  const recentTxs = investments.slice(0, 5).map((inv, i) => {
    const camp = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
    return {
      id: i + 1,
      type: "Buy",
      tokenSymbol: camp?.title?.split(" ")[0]?.toUpperCase() ?? "TKN",
      hash: inv.transaction_hash ?? "0x000000000000",
      valueUSD: (parseFloat(inv.amount || "0") || 0) * ethPrice,
      date: inv.invested_at ?? new Date().toISOString(),
      status: inv.status === "completed" ? "Confirmed" : "Pending",
    };
  });

  // Build invested campaign cards — investedAmount in real USD
  const investedCampaigns = investments.map((inv) => {
    const camp = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
    return {
      id: inv.id,
      name:           camp?.title     ?? `Campaign #${inv.campaign_id}`,
      industry:       camp?.category  ?? "Unknown",
      investedAmount: (parseFloat(inv.amount || "0") || 0) * ethPrice,
      roi:            parseFloat(inv.roi_percent || "0") || 0,
      fundedPercent:  parseFloat(inv.funded_percent || "0") || 0,
    };
  });

  // Top performer = campaign with highest invested amount
  const topCampaign = investedCampaigns.length > 0
    ? investedCampaigns.reduce((a, b) => (a.investedAmount > b.investedAmount ? a : b))
    : null;

  const statCards = [
    { label: "Portfolio Value",   value: formatCurrency(portfolioValue),  change: formatPercent(portfolioChangePct), up: portfolioChangePct >= 0, icon: TrendingUp, sub: "vs. invested" },
    { label: "Equity Tokens",    value: `${formatNumber(totalTokens)} TKN`, change: `${investmentCount} inv.`,     up: true,                    icon: Coins,      sub: "total held"    },
    { label: "Active Campaigns", value: String(investmentCount),          change: `${investmentCount} total`,      up: true,                    icon: Briefcase,  sub: "invested in"   },
    { label: "Total Returns",    value: formatCurrency(portfolioChange),  change: formatPercent(portfolioChangePct), up: portfolioChange >= 0,   icon: DollarSign, sub: "all-time ROI"  },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Loading portfolio…</div>
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[12px] text-[#a78bfa] font-semibold tracking-[0.08em] uppercase mb-1.5">
              Investor Dashboard
            </div>
            <h1 className="text-[28px] font-black tracking-tight text-white m-0">
              My Portfolio Overview
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Showing your invested campaigns and holdings
            </p>
          </div>
          {walletAddress && walletAddress !== "0x..." && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-[#6f42c1]/25 rounded-xl px-4 py-2">
                <Wallet size={14} className="text-[#a78bfa]" />
                <span className="text-[13px] text-white font-medium">
                  {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </div>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-card border border-white/5 rounded-2xl px-[22px] py-5 cursor-default hover:border-[#6f42c1]/40 hover:shadow-[0_4px_24px_rgba(111,66,193,0.1)] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-[0.05em]">
                    {s.label}
                  </div>
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-[#6f42c1]/12 border border-[#6f42c1]/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-[#a78bfa]" />
                  </div>
                </div>
                <div className="text-2xl font-black tracking-tight text-white mb-2">
                  {s.value}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge color={s.up ? "green" : "red"}>
                    {s.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {s.change}
                  </Badge>
                  <span className="text-[11px] text-gray-500">{s.sub}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main grid: chart + top performer ── */}
        <div className="grid grid-cols-[1fr_300px] gap-4 mb-5">

          {/* Portfolio Chart */}
          <div className="bg-card border border-white/5 rounded-2xl px-6 py-[22px]">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] mb-1.5">
                  Portfolio Performance
                </div>
                <div className="text-[26px] font-black tracking-tight text-white">
                  {formatCurrency(portfolioValue)}
                </div>
              </div>
              <Badge color={portfolioChange >= 0 ? "green" : "red"}>
                {portfolioChange >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {formatCurrency(Math.abs(portfolioChange))} ({formatPercent(portfolioChangePct)})
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={portfolioHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6f42c1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6f42c1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6f42c1"
                  strokeWidth={2.5}
                  fill="url(#portfolioGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#a78bfa", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performer Card */}
          {topCampaign ? (
            <div className="bg-gradient-to-br from-[#6f42c1] via-[#5a3599] to-[#3d1f8a] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full bg-white/5" />
              <div className="absolute -bottom-5 -left-7 w-[100px] h-[100px] rounded-full bg-black/15" />
              <div className="absolute top-1/2 -right-2.5 w-[60px] h-[60px] rounded-full bg-white/[0.03]" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="text-[10px] text-white/55 uppercase tracking-[0.08em] mb-3.5">
                  ⭐ Largest Investment
                </div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-11 h-11 rounded-full bg-black/25 flex items-center justify-center text-xs font-black text-white border-2 border-white/20 flex-shrink-0">
                    {topCampaign.name.slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[17px] font-bold text-white truncate max-w-[160px]">{topCampaign.name}</div>
                    <div className="text-xs text-white/55">{topCampaign.industry}</div>
                  </div>
                </div>
                <div className="text-[38px] font-black text-white tracking-tight mb-1">
                  {formatCurrency(topCampaign.investedAmount)}
                </div>
                <div className="text-[13px] text-white/60 mb-auto">Amount invested</div>
                <hr className="border-t border-white/12 my-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-white/45 uppercase tracking-[0.06em] mb-0.5">Industry</div>
                    <div className="text-[14px] font-bold text-white">{topCampaign.industry}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/45 uppercase tracking-[0.06em] mb-0.5">Investments</div>
                    <div className="text-[14px] font-bold text-white">{investmentCount} total</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#6f42c1]/30 via-[#5a3599]/20 to-[#3d1f8a]/10 rounded-2xl p-6 border border-[#6f42c1]/20 flex flex-col items-center justify-center text-center gap-3">
              <Briefcase size={36} className="text-[#a78bfa]/40" />
              <p className="text-white/50 text-sm">No investments yet</p>
              <a href="/investor-dashboard/campaigns" className="text-[#a78bfa] text-xs underline">Browse Campaigns</a>
            </div>
          )}
        </div>

        {/* ── Bottom grid: donut + transactions + quick stats ── */}
        <div className="grid grid-cols-[280px_1fr_260px] gap-4 mb-5">

          {/* Token Allocation Donut */}
          <div className="bg-card border border-white/5 rounded-2xl px-5 py-[22px]">
            <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] mb-4">
              Investment Allocation
            </div>
            {tokenAllocData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={tokenAllocData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {tokenAllocData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{ background: "#0d1117", border: "1px solid rgba(111,66,193,0.25)", borderRadius: 8, color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
                  {tokenAllocData.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: t.color }} />
                      <span className="text-gray-400 flex-1 truncate">{t.name}</span>
                      <span className="text-white font-semibold">
                        {portfolioValue > 0 ? ((t.value / totalInvested) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
                No allocation data
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-[22px] py-5 pb-3.5 flex justify-between items-center">
              <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em]">
                Recent Investments
              </div>
              <a href="/investor-dashboard/transactions" className="text-[11px] text-[#a78bfa] flex items-center gap-1 no-underline hover:underline">
                View all <ExternalLink size={10} />
              </a>
            </div>
            {recentTxs.length > 0 ? recentTxs.map((tx, i) => {
              const iconCls = "bg-green-500/10 text-green-400";
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 px-[22px] py-[11px] ${i !== 0 ? "border-t border-white/[0.04]" : ""}`}
                >
                  <div className={`w-[34px] h-[34px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${iconCls}`}>
                    B
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white">{tx.type} {tx.tokenSymbol}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{truncateHash(tx.hash)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-white">{formatCurrency(tx.valueUSD)}</div>
                    <div className="text-[11px] text-gray-500">{formatDate(tx.date)}</div>
                  </div>
                  <Badge color={tx.status === "Confirmed" ? "green" : tx.status === "Pending" ? "amber" : "red"}>
                    {tx.status}
                  </Badge>
                </div>
              );
            }) : (
              <div className="px-[22px] py-8 text-center text-muted-foreground text-sm">
                No transactions yet
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex flex-col gap-3">

            {/* Top campaign */}
            <div className="bg-card border border-white/5 rounded-xl px-[18px] py-4 flex-1">
              <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-[0.05em]">
                Max Investment
              </div>
              {topCampaignData ? (
                <>
                  <div className="text-sm font-bold text-white truncate leading-tight mb-0.5">
                    {topCampaignData.name}
                  </div>
                  <div className="text-[13px] font-black text-[#a78bfa]">
                    {topCampaignData.amountEth.toFixed(4)} ETH
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 italic">No investments yet</div>
              )}
            </div>

            {/* Total Invested in ETH */}
            <div className="bg-card border border-white/5 rounded-xl px-[18px] py-4 flex-1">
              <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-[0.05em]">
                Total Invested
              </div>
              <div className="text-xl font-black tracking-tight text-white">
                {totalInvestedEth.toFixed(4)}
                <span className="text-[13px] text-gray-400 font-semibold ml-1">ETH</span>
              </div>
            </div>

            {/* Total Tokens — dynamic from DB */}
            <div className="bg-card border border-white/5 rounded-xl px-[18px] py-4 flex-1">
              <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-[0.05em]">
                Total Tokens
              </div>
              <div className="text-xl font-black tracking-tight text-yellow-400">
                {formatNumber(Math.round(totalTokens))}
                <span className="text-[13px] text-gray-400 font-semibold ml-1">TKN</span>
              </div>
            </div>

            {/* Portfolio Value in ETH */}
            <div className="bg-card border border-white/5 rounded-xl px-[18px] py-4 flex-1">
              <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-[0.05em]">
                Portfolio Value
              </div>
              <div className="text-xl font-black tracking-tight text-[#a78bfa]">
                {portfolioValueEth.toFixed(4)}
                <span className="text-[13px] text-gray-400 font-semibold ml-1">ETH</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── My Invested Campaigns ── */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em]">
              My Invested Campaigns
            </div>
            <a href="/investor-dashboard/campaigns" className="text-[11px] text-[#a78bfa] flex items-center gap-1 no-underline hover:underline">
              Browse all <ExternalLink size={10} />
            </a>
          </div>

          {investedCampaigns.length > 0 ? (
            <div className="grid grid-cols-3 gap-3.5">
              {investedCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-card border border-white/5 rounded-2xl px-5 py-[18px] cursor-pointer hover:border-[#6f42c1]/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[#6f42c1] to-[#3d1f8a] flex items-center justify-center text-xs font-black text-white">
                      {(camp.industry || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white truncate">{camp.name}</div>
                      <Badge color="purple">{camp.industry}</Badge>
                    </div>
                    <Badge color={camp.roi >= 0 ? "green" : "red"}>{formatPercent(camp.roi)}</Badge>
                  </div>
                  {camp.fundedPercent > 0 && (
                    <div className="mb-2.5">
                      <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                        <span>Funded</span>
                        <span className="text-white font-semibold">{camp.fundedPercent.toFixed(0)}%</span>
                      </div>
                      <Progress value={camp.fundedPercent} />
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">My Investment</span>
                    <span className="text-white font-semibold">{formatCurrency(camp.investedAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-white/5 rounded-2xl px-8 py-12 text-center">
              <Briefcase size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">No investments yet</p>
              <p className="text-gray-500 text-sm mb-4">Browse campaigns and make your first investment</p>
              <a
                href="/investor-dashboard/campaigns"
                className="inline-block bg-[#6f42c1] hover:bg-[#5a3599] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all"
              >
                Browse Campaigns
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
