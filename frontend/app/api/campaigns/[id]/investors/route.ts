import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("id, price_per_token")
      .eq("id", id)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const { data: investments, error: investmentsError } = await supabaseAdmin
      .from("investments")
      .select("investor_id, amount, equity_tokens, token_price_at_investment, invested_at")
      .eq("campaign_id", campaign.id)
      .eq("status", "completed")
      .order("invested_at", { ascending: false });

    if (investmentsError) throw investmentsError;

    const investorIds = [...new Set((investments || []).map((investment) => investment.investor_id).filter(Boolean))];
    const { data: profiles, error: profilesError } = investorIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, full_name, avatar_url")
          .in("user_id", investorIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profilesById = new Map((profiles || []).map((profile) => [String(profile.user_id), profile]));
    const investorsById = new Map();
    for (const investment of investments || []) {
      const investorId = investment.investor_id ? String(investment.investor_id) : null;
      const profile = investorId ? profilesById.get(investorId) : null;
      const key = investorId || `anonymous-${investorsById.size}`;
      const amount = Number(investment.amount) || 0;
      const tokenPrice = Number(investment.token_price_at_investment) || Number(campaign.price_per_token) || 0;
      const recordedTokens = Number(investment.equity_tokens) || 0;
      const existing = investorsById.get(key) || {
        name: profile?.display_name || profile?.full_name || "Investor",
        avatarUrl: profile?.avatar_url || null,
        amount: 0,
        tokens: 0,
        investedAt: investment.invested_at || null,
      };

      existing.amount += amount;
      existing.tokens += recordedTokens > 0 ? recordedTokens : tokenPrice > 0 ? amount / tokenPrice : 0;
      if (investment.invested_at && new Date(investment.invested_at) > new Date(existing.investedAt || 0)) {
        existing.investedAt = investment.invested_at;
      }
      investorsById.set(key, existing);
    }

    const investors = [...investorsById.values()].sort(
      (a, b) => new Date(b.investedAt || 0).getTime() - new Date(a.investedAt || 0).getTime(),
    );

    return NextResponse.json({
      investors,
      investorCount: investors.length,
      totalAmount: (investments || []).reduce((total, investment) => total + (Number(investment.amount) || 0), 0),
    });
  } catch (error) {
    console.error("Failed to load campaign investors:", error);
    return NextResponse.json({ error: "Unable to load campaign investors." }, { status: 500 });
  }
}
