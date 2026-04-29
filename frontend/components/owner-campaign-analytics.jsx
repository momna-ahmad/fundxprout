"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

const GRID_COLOR = "rgba(255,255,255,0.06)";
const AXIS_COLOR = "#6b7280";
const TOOLTIP_STYLE = {
  backgroundColor: "#1e2530",
  border: "1px solid rgba(111,66,193,0.4)",
  borderRadius: "12px",
  color: "#fff",
  fontSize: 12,
};

const STATUS_COLORS = {
  launched: "#28a745",
  draft: "#f59e0b",
  ended: "#6b7280",
  completed: "#0ea5e9",
  cancelled: "#ef4444",
  default: "#a78bfa",
};

const PIE_COLORS = ["#a78bfa", "#6f42c1", "#28a745", "#f59e0b", "#ef4444"];

function toNumber(value) {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(status) {
  return (status || "unknown").toString().toLowerCase();
}

function calcProgress(campaign) {
  const goal = toNumber(campaign.funding_goal);
  if (goal <= 0) return 0;
  return Math.min(100, (toNumber(campaign.amount_pledged) / goal) * 100);
}

function calcDaysLeft(createdAt, durationDays) {
  const deadline = new Date(
    new Date(createdAt).getTime() + (durationDays ?? 30) * 24 * 60 * 60 * 1000,
  );
  const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatMonthKey(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function buildMonthlyData(campaigns) {
  const monthlyMap = new Map();

  campaigns.forEach((campaign) => {
    const createdAt = campaign.created_at || new Date().toISOString();
    const month = formatMonthKey(createdAt);
    const createdTs = new Date(createdAt).getTime();

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        sortKey: createdTs,
        goal: 0,
        pledged: 0,
        campaigns: 0,
      });
    }

    const entry = monthlyMap.get(month);
    entry.goal += toNumber(campaign.funding_goal);
    entry.pledged += toNumber(campaign.amount_pledged);
    entry.campaigns += 1;
    entry.sortKey = Math.min(entry.sortKey, createdTs);
  });

  return [...monthlyMap.values()]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...entry }) => entry);
}

function buildCategoryData(campaigns) {
  const categoryMap = new Map();

  campaigns.forEach((campaign) => {
    const category = campaign.category || "Uncategorized";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        goal: 0,
        pledged: 0,
        investors: 0,
      });
    }

    const entry = categoryMap.get(category);
    entry.goal += toNumber(campaign.funding_goal);
    entry.pledged += toNumber(campaign.amount_pledged);
    entry.investors += Number(campaign.investor_count ?? 0);
  });

  return [...categoryMap.values()].sort((a, b) => b.pledged - a.pledged);
}

function buildStatusData(campaigns) {
  const statusMap = new Map();

  campaigns.forEach((campaign) => {
    const status = normalizeStatus(campaign.status);
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  return [...statusMap.entries()].map(([status, value]) => ({ status, value }));
}

function formatCompactEth(value) {
  return `${value.toFixed(3)} ETH`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2 shadow-xl">
      {label && <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>}
      {payload.map((item, index) => (
        <p key={index} style={{ color: item.color }} className="text-xs font-semibold">
          {item.name}: {typeof item.value === "number" ? item.value.toFixed(3) : item.value}
          {item.name?.toLowerCase().includes("investor") || item.name === "Campaigns" ? "" : " ETH"}
        </p>
      ))}
    </div>
  );
}

export default function OwnerCampaignAnalytics({ campaigns = [] }) {
  const totalGoal = campaigns.reduce((sum, campaign) => sum + toNumber(campaign.funding_goal), 0);
  const totalPledged = campaigns.reduce((sum, campaign) => sum + toNumber(campaign.amount_pledged), 0);
  const activeCampaigns = campaigns.filter((campaign) => normalizeStatus(campaign.status) === "launched").length;
  const endedCampaigns = campaigns.filter((campaign) => calcDaysLeft(campaign.created_at, campaign.duration) === 0).length;
  const fullyFunded = campaigns.filter((campaign) => calcProgress(campaign) >= 100).length;
  const averageProgress = campaigns.length
    ? campaigns.reduce((sum, campaign) => sum + calcProgress(campaign), 0) / campaigns.length
    : 0;
  const successRate = campaigns.length ? (fullyFunded / campaigns.length) * 100 : 0;

  const statusData = buildStatusData(campaigns);
  const monthlyData = buildMonthlyData(campaigns);
  const categoryData = buildCategoryData(campaigns);
  const topCampaigns = [...campaigns]
    .map((campaign) => ({
      ...campaign,
      progress: calcProgress(campaign),
      pledged: toNumber(campaign.amount_pledged),
      goal: toNumber(campaign.funding_goal),
    }))
    .sort((a, b) => b.progress - a.progress || b.pledged - a.pledged)
    .slice(0, 5);

  if (campaigns.length === 0) {
    return (
      <div className="bg-[#0d1117] rounded-3xl border border-white/5 p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#6f42c1]/15 flex items-center justify-center">
          <TrendingUp className="h-7 w-7 text-[#a78bfa]" />
        </div>
        <h3 className="text-xl font-bold text-white">No campaign analytics yet</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
          Once you launch campaigns, this page will show your funding progress, status mix,
          and category performance across only your own projects.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, sub: `${activeCampaigns} active now` },
          { label: "Total Goal", value: formatCompactEth(totalGoal), sub: `${endedCampaigns} ended campaigns` },
          { label: "Total Pledged", value: formatCompactEth(totalPledged), sub: `${averageProgress.toFixed(1)}% avg progress` },
          { label: "Success Rate", value: `${successRate.toFixed(1)}%`, sub: `${fullyFunded} fully funded` },
        ].map((item) => (
          <div key={item.label} className="bg-[#1e2530] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-2xl font-black text-white">{item.value}</p>
            <p className="text-xs text-[#a78bfa] mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
          <p className="text-sm font-bold text-white mb-1">Campaign Status Distribution</p>
          <p className="text-xs text-gray-400 mb-4">How your campaigns are currently distributed</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="status" cx="50%" cy="50%" innerRadius={72} outerRadius={108} paddingAngle={3}>
                {statusData.map((entry, index) => (
                  <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length] || STATUS_COLORS.default} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 800, fill: "#fff" }}>
                {campaigns.length}
              </text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fill: "#9ca3af" }}>
                campaigns
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
          <p className="text-sm font-bold text-white mb-1">Funding Over Time</p>
          <p className="text-xs text-gray-400 mb-4">Pledged ETH and goal size grouped by creation month</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ownerGoalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ownerPledgedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28a745" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#28a745" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Area type="monotone" dataKey="goal" name="Goal" stroke="#a78bfa" strokeWidth={2} fill="url(#ownerGoalFill)" dot={false} />
              <Area type="monotone" dataKey="pledged" name="Pledged" stroke="#28a745" strokeWidth={2} fill="url(#ownerPledgedFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
          <p className="text-sm font-bold text-white mb-1">Funding by Category</p>
          <p className="text-xs text-gray-400 mb-4">Goal versus pledged ETH across your campaign categories</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} barGap={4} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="category" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(111,66,193,0.08)" }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Bar dataKey="goal" name="Goal" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="pledged" name="Pledged" fill="#28a745" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e2530] border border-white/5 rounded-2xl p-6">
          <p className="text-sm font-bold text-white mb-1">Top Campaigns</p>
          <p className="text-xs text-gray-400 mb-4">Your strongest campaigns by funding progress</p>
          <div className="space-y-4">
            {topCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-[#0d1117] border border-white/5 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{campaign.title}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{campaign.category || "Uncategorized"}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#a78bfa] whitespace-nowrap">
                    {campaign.progress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-[#6f42c1] h-1.5 rounded-full"
                    style={{ width: `${campaign.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatCompactEth(campaign.pledged)} pledged</span>
                  <span>{formatCompactEth(campaign.goal)} goal</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}