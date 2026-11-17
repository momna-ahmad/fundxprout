// frontend/app/investor-dashboard/overview/page.jsx
"use client";
import { useState, useEffect } from "react";
import {
  TrendingUp, Coins, Briefcase, Gavel, ArrowUpRight,
  ArrowDownRight, ExternalLink, Wallet,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getUserPortfolioData, getUserTokenHoldings, getTopSellListings, generatePortfolioTimeSeries } from "@/utils/supabase/getPortfolio";
import { getMyBids } from "@/lib/bidding-api";

// ── Helpers ──────────────────────────────────────────────────────────
const formatCurrency = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const formatPercent = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`;
const truncateHash  = (h) => `${h.slice(0, 8)}…${h.slice(-6)}`;
const formatDate    = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const formatChartDate = (timestamp, range) => new Date(Number(timestamp)).toLocaleDateString(
  "en-US",
  range === "1M" || range === "3M"
    ? { month: "short", day: "numeric" }
    : { month: "short", year: "2-digit" },
);


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

function CustomTooltip({ active, payload, label, range }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[#6f42c1]/30 rounded-xl px-3.5 py-2.5">
      <div className="text-[11px] text-gray-400 mb-1">{formatChartDate(label, range)}</div>
      <div className="text-[15px] font-bold text-[#a78bfa]">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function DashboardPage() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [tokenHoldings, setTokenHoldings] = useState([]);
  const [topSellListings, setTopSellListings] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [portfolioRange, setPortfolioRange] = useState("1Y");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [data, holdings, sellListings, bidsResult] = await Promise.all([
        getUserPortfolioData(),
        getUserTokenHoldings(),
        getTopSellListings(5),
        getMyBids().catch((error) => {
          console.error("[Investor overview] Failed to load recent bids:", error);
          return { bids: [] };
        }),
      ]);
      
      setPortfolioData(data);
      setTokenHoldings(holdings);
      setTopSellListings(sellListings);
      setRecentBids((bidsResult.bids || []).slice(0, 4));

      setLoading(false);
    }

    loadData();
  }, []);

  // Derive values
  const totalInvested      = portfolioData?.totalNetWorthUsd   ?? portfolioData?.totalInvested ?? 0;
  const totalInvestedEth   = portfolioData?.totalEthInvested   ?? 0;
  const portfolioValue = tokenHoldings.reduce((sum, token) => sum + (Number(token.value) || 0), 0);
  const portfolioCostBasis = tokenHoldings.reduce((sum, token) => sum + (Number(token.totalInvested) || 0), 0);
  const portfolioProfit = portfolioValue - portfolioCostBasis;
  const portfolioChangePct = portfolioCostBasis > 0 ? (portfolioProfit / portfolioCostBasis) * 100 : 0;
  const investmentCount    = portfolioData?.investments?.length ?? 0;
  const walletAddress      = portfolioData?.walletAddress      ?? null;
  const investments        = portfolioData?.investments        ?? [];
  const campaignsHeldCount = tokenHoldings.length;

  // Derive live ETH→USD rate from the two values already in portfolio data
  const ethPrice = totalInvestedEth > 0 ? totalInvested / totalInvestedEth : 3000;

  // Portfolio history from real investments
  const portfolioHistory = generatePortfolioTimeSeries(investments, portfolioRange, ethPrice);
  const chartValue = portfolioHistory.length > 0
    ? portfolioHistory[portfolioHistory.length - 1].value
    : 0;

  // Recent transactions built from investments
  const recentTxs = investments.slice(0, 5).map((inv, i) => {
    const camp = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
    return {
      id: i + 1,
      type: "Buy",
      tokenSymbol: camp?.title?.split(" ")[0]?.toUpperCase() ?? "TKN",
      hash: inv.transaction_hash ?? "0x000000000000",
      valueETH: parseFloat(inv.amount || "0") || 0,
      date: inv.invested_at ?? new Date().toISOString(),
      status: inv.status === "completed" ? "Confirmed" : "Pending",
    };
  });

  const statCards = [
    { label: "Portfolio Value",   value: formatCurrency(portfolioValue),  change: formatPercent(portfolioChangePct), up: portfolioChangePct >= 0, icon: TrendingUp, sub: `${portfolioProfit >= 0 ? "+" : "−"}${formatCurrency(Math.abs(portfolioProfit))} profit` },
    { label: "Total ETH Invested", value: `${Number(totalInvestedEth).toFixed(4)} ETH`, change: `${investmentCount} inv.`, up: true, icon: Coins, sub: "across campaigns" },
    { label: "Campaigns Held", value: String(campaignsHeldCount), change: `${campaignsHeldCount} total`, up: true, icon: Briefcase, sub: "with token holdings" },
    { label: "Profit Margin", value: formatPercent(portfolioChangePct), change: formatCurrency(portfolioProfit), up: portfolioProfit >= 0, icon: TrendingUp, sub: "current holdings vs. cost" },
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
              Portfolio performance and token trading activity
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
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

        {/* ── Main grid: chart + recent bids ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 mb-5">

          {/* Portfolio Chart */}
          <div className="bg-card border border-white/5 rounded-2xl px-6 py-[22px]">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] mb-1.5">
                  Cumulative Invested
                </div>
                <div className="text-[26px] font-black tracking-tight text-white">
                  {formatCurrency(chartValue)}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Dated contributions converted at the current ETH rate
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {["1M", "3M", "6M", "1Y"].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setPortfolioRange(range)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      portfolioRange === range
                        ? "border-[#6f42c1]/50 bg-[#6f42c1]/20 text-[#c4b5fd]"
                        : "border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            {portfolioHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={portfolioHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6f42c1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6f42c1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(timestamp) => formatChartDate(timestamp, portfolioRange)}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip content={<CustomTooltip range={portfolioRange} />} />
                  <Area
                    type="stepAfter"
                    dataKey="value"
                    stroke="#6f42c1"
                    strokeWidth={2.5}
                    fill="url(#portfolioGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#a78bfa", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-gray-500">
                No dated investments available for this time range.
              </div>
            )}
          </div>

          {/* Latest bids */}
          <div className="bg-card border border-white/5 rounded-2xl px-5 py-[22px]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em]">Latest Bids</div>
                <p className="mt-1 text-xs text-gray-500">Your most recent token offers</p>
              </div>
              <a href="/investor-dashboard/my-bids" className="flex shrink-0 items-center gap-1 text-xs text-[#a78bfa] hover:underline">
                View all <ExternalLink size={11} />
              </a>
            </div>
            {recentBids.length > 0 ? (
              <div className="divide-y divide-white/[0.05]">
                {recentBids.map((bid) => {
                  const listing = Array.isArray(bid.token_orders) ? bid.token_orders[0] : bid.token_orders;
                  const campaign = Array.isArray(listing?.campaigns) ? listing.campaigns[0] : listing?.campaigns;
                  return (
                    <div key={bid.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa]/15 bg-[#6f42c1]/15">
                        <Gavel size={15} className="text-[#c4b5fd]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{campaign?.token_symbol || campaign?.title || `Campaign #${bid.campaign_id}`}</p>
                        <p className="truncate text-[11px] text-gray-500">{Number(bid.quantity).toLocaleString()} tokens · {formatDate(bid.created_at)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold tabular-nums text-white">{Number(bid.bid_price_per_token).toFixed(3)} ETH / token</p>
                        <p className="text-[10px] capitalize text-gray-500">{String(bid.status).replaceAll("_", " ")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-gray-500">
                <Gavel size={20} className="text-gray-600" />
                No bids placed yet.
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom grid: donut + transactions + quick stats ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 mb-5">

          {/* Investor's highest-priced active marketplace sell listings */}
          <div className="bg-card border border-white/5 rounded-2xl px-5 py-[22px]">
            <div className="mb-4">
              <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em]">Top 5 Sell Listings</div>
              <p className="mt-1 text-xs text-gray-500">Your active marketplace listings, highest price first</p>
            </div>
            {topSellListings.length > 0 ? (
              <div className="divide-y divide-white/[0.05]">
                {topSellListings.map((listing, index) => (
                  <div key={listing.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-5 text-xs font-bold text-gray-500">{index + 1}</span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa]/15 bg-[#6f42c1]/15 text-[10px] font-bold text-[#c4b5fd]">
                      {listing.symbol.slice(0, 4)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{listing.symbol}</p>
                      <p className="truncate text-[11px] text-gray-500">{listing.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold tabular-nums text-white">{Number(listing.priceEth).toFixed(3)} ETH / token</p>
                      <p className="text-[10px] text-gray-500">{Number(listing.quantityRemaining).toLocaleString(undefined, { maximumFractionDigits: 2 })} available</p>
                    </div>
                    <Badge color="green">{listing.status === "partially_filled" ? "Partial" : "Open"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-center text-xs text-gray-500">
                You have no active sell listings.
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
                    <div className="text-[13px] font-semibold text-white">{tx.valueETH.toFixed(4)} ETH</div>
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
        </div>


      </div>
    </div>
  );
}
