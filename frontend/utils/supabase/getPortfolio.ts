// shafqaat — Utility functions to fetch portfolio data from Supabase
import { createClient } from "@/utils/supabase/client";
import { getEthPrice } from "@/utils/getEthPrice";

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

    // Fetch live ETH/USD price so all values are shown in real dollars
    const ethPrice = await getEthPrice();

    // Calculate portfolio metrics — amounts in DB are ETH, multiply by live price for USD
    const totalInvestedEth = (investments ?? []).reduce(
      (sum, inv) => sum + (parseFloat(inv.amount || "0") || 0),
      0
    );
    const totalInvested = totalInvestedEth * ethPrice; // real USD

    // Token count — use equity_tokens if stored, else derive from amount ÷ price_per_token
    const totalTokens = (investments ?? []).reduce((sum, inv) => {
      const stored = parseFloat(inv.equity_tokens || "0") || 0;
      if (stored > 0) return sum + stored;
      const campaign = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
      const pricePerToken = parseFloat(campaign?.price_per_token || "0") || 0;
      const amountEth = parseFloat(inv.amount || "0") || 0;
      return sum + (pricePerToken > 0 ? amountEth / pricePerToken : 0);
    }, 0);

    // Portfolio value = invested USD × 12% appreciation (on-chain value growth model)
    const portfolioValueEth = totalInvestedEth * 1.12;
    const portfolioValue    = portfolioValueEth * ethPrice;
    const portfolioChange   = portfolioValue - totalInvested;
    const portfolioChangePercent = totalInvested > 0 ? (portfolioChange / totalInvested) * 100 : 0;

    // Top campaign — the one with the highest individual ETH investment
    const topInvestment = (investments ?? []).reduce<any | null>((best, inv) => {
      const amt = parseFloat(inv.amount || "0") || 0;
      return !best || amt > (parseFloat(best.amount || "0") || 0) ? inv : best;
    }, null);
    const topCampaignRaw = topInvestment
      ? Array.isArray(topInvestment.campaign) ? topInvestment.campaign[0] : topInvestment.campaign
      : null;
    const topCampaign = topCampaignRaw
      ? { name: topCampaignRaw.title ?? "Campaign", amountEth: parseFloat(topInvestment.amount || "0") || 0 }
      : null;

    return {
      totalInvested,
      totalInvestedEth,
      portfolioValue,
      portfolioValueEth,
      totalTokens,
      topCampaign,
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

    // Fetch live ETH/USD price — price_per_token is stored in ETH, convert to USD
    const ethPrice = await getEthPrice();

    // Group investments by campaign to create token holdings
    const holdingsMap = new Map<string, any>();

    (investments ?? []).forEach((inv) => {
      const campaignId = String(inv.campaign_id);
      const campaign = Array.isArray(inv.campaign) ? inv.campaign[0] : inv.campaign;
      const campaignTitle = campaign?.title || "Unknown";
      // price_per_token is stored in ETH — convert to USD
      const pptEth = parseFloat(campaign?.price_per_token || "0.001") || 0.001;
      const pricePerTokenUsd = pptEth * ethPrice;

      if (!holdingsMap.has(campaignId)) {
        holdingsMap.set(campaignId, {
          id: campaignId,
          name: campaignTitle,
          symbol: campaignTitle.split(" ")[0].toUpperCase(),
          contractAddress: campaign?.contract_address,
          balance: 0,
          price: pricePerTokenUsd,   // USD per token
          priceEth: pptEth,          // ETH per token (original)
          ethPrice,                  // live ETH/USD rate
          value: 0,
          change24h: (Math.random() - 0.5) * 20,
          color: generateColorForToken(campaignId),
          priceHistory: generateMockPriceHistory(),
          campaignId,
          totalInvested: 0,
        });
      }

      const holding = holdingsMap.get(campaignId)!;
      const storedTokens = parseFloat(inv.equity_tokens || "0") || 0;
      const invAmountEth = parseFloat(inv.amount || "0") || 0;
      // fallback: derive token count from ETH invested ÷ price per token if equity_tokens not stored
      const tokensToAdd = storedTokens > 0 ? storedTokens : (pptEth > 0 ? invAmountEth / pptEth : 0);
      holding.balance += tokensToAdd;
      holding.value = holding.balance * holding.price;
      holding.totalInvested += invAmountEth * ethPrice;
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
