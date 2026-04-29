// shafqaat — Utility functions to fetch portfolio data from Supabase
import { createClient } from "@/utils/supabase/client";

// Fetch user's portfolio data (all their investments aggregated)
export async function getUserPortfolioData() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch all investments for the user
    const { data: investments, error: invError } = await supabase
      .from("investments")
      .select(`
        *,
        campaign:campaigns(id, title, category, price_per_token)
      `)
      .eq("investor_id", user.id)
      .eq("status", "completed")
      .order("invested_at", { ascending: false });

    if (invError) {
      console.error("[getUserPortfolioData] Investments fetch error:", invError);
      return null;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[getUserPortfolioData] Profile fetch error:", profileError);
    }

    // Calculate portfolio metrics
    const totalInvested = (investments ?? []).reduce(
      (sum, inv) => sum + (parseFloat(inv.amount || "0") || 0),
      0
    );

    const totalTokens = (investments ?? []).reduce(
      (sum, inv) => sum + (parseFloat(inv.equity_tokens || "0") || 0),
      0
    );

    // Generate mock portfolio value (this would be calculated from token prices in production)
    const portfolioValue = totalInvested * 1.12; // Mock 12% appreciation
    const portfolioChange = portfolioValue - totalInvested;
    const portfolioChangePercent = totalInvested > 0 ? (portfolioChange / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalTokens,
      portfolioValue,
      investmentCount: investments?.length || 0,
      portfolioChange,
      portfolioChangePercent,
      walletAddress: profile?.wallet_address || "0x...",
      profile,
      investments,
    };
  } catch (err) {
    console.error("[getUserPortfolioData] Exception:", err);
    return null;
  }
}

// Fetch token holdings with aggregation
export async function getUserTokenHoldings() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: investments, error } = await supabase
      .from("investments")
      .select(`
        *,
        campaign:campaigns(id, title, category, price_per_token, contract_address)
      `)
      .eq("investor_id", user.id)
      .eq("status", "completed");

    if (error) {
      console.error("[getUserTokenHoldings] Supabase error:", error);
      return [];
    }

    // Group investments by campaign to create token holdings
    const holdingsMap = new Map<string, any>();

    (investments ?? []).forEach((inv) => {
      const campaignId = String(inv.campaign_id);
      const campaign = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
      const campaignTitle = campaign?.title || "Unknown";

      if (!holdingsMap.has(campaignId)) {
        holdingsMap.set(campaignId, {
          id: campaignId,
          name: campaignTitle,
          symbol: campaignTitle.split(" ")[0].toUpperCase(),
          contractAddress: campaign?.contract_address,
          balance: 0,
          price: parseFloat(campaign?.price_per_token || "1") || 1,
          value: 0,
          change24h: (Math.random() - 0.5) * 20, // Mock 24h change
          color: generateColorForToken(campaignId),
          priceHistory: generateMockPriceHistory(),
          campaignId,
          totalInvested: 0,
        });
      }

      const holding = holdingsMap.get(campaignId)!;
      holding.balance += parseFloat(inv.equity_tokens || "0") || 0;
      holding.value = holding.balance * holding.price;
      holding.totalInvested += parseFloat(inv.amount || "0") || 0;
    });

    return Array.from(holdingsMap.values());
  } catch (err) {
    console.error("[getUserTokenHoldings] Exception:", err);
    return [];
  }
}

// Generate mock price history for charts (in production, fetch from price oracle)
function generateMockPriceHistory(): number[] {
  const history = [];
  let price = 100;
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.48) * 10;
    history.push(Math.max(price, 10));
  }
  return history;
}

// Generate consistent color for each token based on ID
function generateColorForToken(tokenId: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B88B",
    "#AED6F1",
  ];
  const hash = tokenId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Calculate portfolio allocation by campaign
export async function getPortfolioAllocation() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: investments, error } = await supabase
      .from("investments")
      .select(`
        amount,
        campaign:campaigns(title)
      `)
      .eq("investor_id", user.id)
      .eq("status", "completed");

    if (error) {
      console.error("[getPortfolioAllocation] Supabase error:", error);
      return [];
    }

    const totalValue = (investments ?? []).reduce(
      (sum, inv) => sum + (parseFloat(inv.amount || "0") || 0),
      0
    );

    return (investments ?? []).map((inv) => {
      const campaign = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
      return {
        name: campaign?.title || "Unknown",
        value: parseFloat(inv.amount || "0") || 0,
        percentage: totalValue > 0 ? ((parseFloat(inv.amount || "0") || 0) / totalValue) * 100 : 0,
      };
    });
  } catch (err) {
    console.error("[getPortfolioAllocation] Exception:", err);
    return [];
  }
}

// Calculate portfolio value over time (mock data for charts)
export function generatePortfolioTimeSeries(investments: any[]): any[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const baseValue = investments.reduce((sum, inv) => sum + (parseFloat(inv.amount || "0") || 0), 0);

  return months.map((month, index) => ({
    month,
    value: baseValue * (1 + (index * 0.02 + (Math.random() - 0.5) * 0.05)), // Mock growth
  }));
}
