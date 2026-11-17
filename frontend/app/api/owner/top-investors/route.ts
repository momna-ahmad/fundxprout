import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from("campaigns")
      .select("id")
      .eq("owner", user.id);
    if (campaignsError) throw campaignsError;

    const campaignIds = (campaigns || []).map((campaign) => campaign.id);
    if (!campaignIds.length) return NextResponse.json({ investors: [] });

    const { data: investments, error: investmentsError } = await supabaseAdmin
      .from("investments")
      .select("investor_id, campaign_id, amount")
      .in("campaign_id", campaignIds)
      .in("status", ["completed", "claimed", "active"]);
    if (investmentsError) throw investmentsError;

    const totals = new Map<string, { total: number; campaignIds: Set<string> }>();
    for (const investment of investments || []) {
      if (!investment.investor_id) continue;
      const id = String(investment.investor_id);
      const row = totals.get(id) || { total: 0, campaignIds: new Set<string>() };
      row.total += Number(investment.amount) || 0;
      row.campaignIds.add(String(investment.campaign_id));
      totals.set(id, row);
    }

    const ranked = [...totals.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const { data: profiles, error: profilesError } = ranked.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, full_name, avatar_url")
          .in("user_id", ranked.map((investor) => investor.id))
      : { data: [], error: null };
    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map((profile) => [String(profile.user_id), profile]));
    const investors = ranked.map((investor) => {
      const profile = profileById.get(investor.id);
      return {
        id: investor.id,
        name: profile?.display_name?.trim() || profile?.full_name?.trim() || "Unnamed investor",
        avatarUrl: profile?.avatar_url || null,
        total: investor.total,
        campaignCount: investor.campaignIds.size,
      };
    });

    return NextResponse.json({ investors });
  } catch (error) {
    console.error("[owner/top-investors] Failed to load investors:", error);
    return NextResponse.json({ error: "Unable to load top investors." }, { status: 500 });
  }
}
