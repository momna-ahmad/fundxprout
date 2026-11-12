import { createClient } from "@/utils/supabase/client";

export type MarketAnalyticsData = {
  stats: {
    totalRaisedEth: string;
    activeCampaigns: number;
    totalBackers: number;
    successRate: string;
  };
  campaignStatusData: { name: string; value: number }[];
  categoryData: { category: string; raised: number; backers: number }[];
  monthlyGrowth: { month: string; raised: number; campaigns: number }[];
};

export async function getMarketAnalytics(): Promise<MarketAnalyticsData> {
  const supabase = createClient();

  // 1. Fetch campaigns using your exact DB column names
  const { data: campaigns, error: campError } = await supabase
    .from("campaigns")
    .select("id, category, amount_pledged, funding_goal, status, created_at");

  if (campError) {
    console.error("Error fetching campaigns for analytics:", campError);
  }

  // 2. Fetch investments directly without filtering on non-existent 'status' column
  const { data: investments, error: invError } = await supabase
    .from("investments")
    .select("investor_id, investor_address, campaign_id, amount, invested_at");

  if (invError) {
    console.error("Error fetching investments for analytics:", invError);
  }

  const campaignList = campaigns || [];
  const investmentList = investments || [];
  console.log(investmentList);

  // ── Stat 1: Total ETH Raised ─────────────────────────────────────
  const totalEthWei = campaignList.reduce(
    (acc, c) => acc + Number(c.amount_pledged || 0),
    0
  );

  // ── Stat 2: Active Campaigns ─────────────────────────────────────
  const activeCount = campaignList.filter(
    (c) => c.status === "launched" || c.status === "approved"
  ).length;

  // ── Stat 3: Total Unique Backers ─────────────────────────────────
  const uniqueBackers = new Set(investmentList.map((i) => i.investor_id)).size;

  // ── Stat 4: Success Rate ─────────────────────────────────────────
  const successful = campaignList.filter(
    (c) =>
      c.status === "successful" ||
      (Number(c.funding_goal) > 0 && Number(c.amount_pledged) >= Number(c.funding_goal))
  ).length;

  const successRate =
    campaignList.length > 0
      ? ((successful / campaignList.length) * 100).toFixed(1) + "%"
      : "0.0%";

  // ── Donut Chart: Campaign Status Distribution ────────────────────
  const statusLabels: Record<string, string> = {
    launched: "Active Raising",
    approved: "Ready to Launch",
    in_review: "Under Review",
    successful: "Fully Funded",
    draft: "Drafting",
  };

  const statusCounts: Record<string, number> = {};
  campaignList.forEach((c) => {
    const rawStatus = (c.status || "active").toLowerCase();
    const formatted = statusLabels[rawStatus] || "Active Raising";
    statusCounts[formatted] = (statusCounts[formatted] || 0) + 1;
  });

  const totalCamps = campaignList.length || 1;
  const campaignStatusData = Object.entries(statusCounts).map(([name, count]) => ({
    name,
    value: parseFloat(((count / totalCamps) * 100).toFixed(1)),
  }));

  const fallbackStatus = [{ name: "Active Raising", value: 100 }];

  // ── Bar Chart: Funding by Category ──────────────────────────────
  const categoryMap: Record<string, { raised: number; backers: Set<string> }> = {};

  campaignList.forEach((c) => {
    const cat = c.category || "General";
    if (!categoryMap[cat]) {
      categoryMap[cat] = { raised: 0, backers: new Set() };
    }
    // Fixed: uses amount_pledged
    categoryMap[cat].raised += Number(c.amount_pledged || 0);
  });

  // Count unique backers per campaign category
  investmentList.forEach((inv) => {
    // Campaign IDs can be number or string; compare via String()
    const relatedCamp = campaignList.find((c) => String(c.id) === String(inv.campaign_id));
    if (relatedCamp) {
      const cat = relatedCamp.category || "General";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { raised: 0, backers: new Set() };
      }
      const identifier = inv.investor_address?.toLowerCase() || inv.investor_id;
      if (identifier) {
        categoryMap[cat].backers.add(identifier);
      }
    }
  });

  const categoryData = Object.entries(categoryMap).map(([category, info]) => ({
    category,
    raised: parseFloat(info.raised.toFixed(2)),
    backers: info.backers.size,
  }));

  // ── Area Chart: Monthly Platform Growth (Past 12 Months) ─────────
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyBuckets: { month: string; monthIndex: number; year: number; raised: number; campaigns: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonthIdx - i, 1);
    monthlyBuckets.push({
      month: months[d.getMonth()],
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      raised: 0,
      campaigns: 0,
    });
  }

  campaignList.forEach((c) => {
    if (!c.created_at) return;
    const date = new Date(c.created_at);
    const bucket = monthlyBuckets.find(
      (b) => b.monthIndex === date.getMonth() && b.year === date.getFullYear()
    );
    if (bucket) {
      bucket.campaigns += 1;
      // Fixed: uses amount_pledged
      bucket.raised += Number(c.amount_pledged || 0);
    }
  });

  const monthlyGrowth = monthlyBuckets.map((b) => ({
    month: b.month,
    raised: parseFloat(b.raised.toFixed(2)),
    campaigns: b.campaigns,
  }));

  return {
    stats: {
      totalRaisedEth: totalEthWei > 0 ? `${totalEthWei.toFixed(2)} ETH` : "0.00 ETH",
      activeCampaigns: activeCount,
      totalBackers: uniqueBackers,
      successRate,
    },
    campaignStatusData: campaignStatusData.length > 0 ? campaignStatusData : fallbackStatus,
    categoryData: categoryData.length > 0 ? categoryData : [{ category: "General", raised: 0, backers: 0 }],
    monthlyGrowth,
  };
}