// shafqaat — Supabase data-fetching utilities for campaigns
import { createClient } from "@/utils/supabase/client";

// Helper function to normalize campaign data from various possible field names
function normalizeCampaign(raw: any) {
  return {
    ...raw, // ✅ spread FIRST so explicit fields below win
    id: raw.id,
    title: raw.title,
    description: raw.description,
    funding_goal: raw.funding_goal || raw.goal_amount || raw.goal || "0",
    duration: raw.duration || raw.duration_days || 30,
    category: raw.category,
    image_url: raw.image_url || raw.image_hash || null,
    transaction_hash: raw.transaction_hash || raw.tx_hash || null,
    price_per_token: raw.price_per_token || "0",
    valuation: raw.valuation ?? null,
    contract_address: raw.contract_address,
    created_at: raw.created_at,
    owner: raw.owner || raw.owner_wallet,
    pitch_deck_url: raw.pitch_deck_url,
    business_plan_url: raw.business_plan_url,
    financials_url: raw.financials_url,
    use_of_funds_url: raw.use_of_funds_url,
    product_demo_url: raw.product_demo_url,

    // AI Risk Assessment Fields
    risk_score: raw.risk_score ?? null,
    ai_prep_time_days: raw.ai_prep_time_days ?? null,
    ai_reasons: raw.ai_reasons ?? null,
    problem_statement: raw.problem_statement ?? null,
    proof_of_capability: raw.proof_of_capability ?? null,
    idea_clarity: raw.idea_clarity ?? null,
    differentiation: raw.differentiation ?? null,
    gtm_strategy: raw.gtm_strategy ?? null,
    business_model: raw.business_model ?? null,
    vagueness: raw.vagueness ?? null,
    credibility: raw.credibility ?? null,
    amount_pledged: raw.amount_pledged ?? "0",
    investor_count: raw.investor_count ?? 0,
  };
}

// Attach live aggregate stats from investments table.
async function attachCampaignStats(campaigns: any[]) {
  if (!campaigns || campaigns.length === 0) return campaigns;

  const supabase = createClient();
  const campaignIds = campaigns.map((c) => c.id);

  const { data, error } = await supabase
    .from("investments")
    .select("campaign_id, investor_id, amount")
    .in("campaign_id", campaignIds)
    .eq("status", "completed");

  if (error) {
    console.error("[attachCampaignStats] Supabase error:", error);
    return campaigns;
  }

  const statsMap = new Map<
    string,
    { amount_pledged: number; investors: Set<string> }
  >();

  for (const inv of data ?? []) {
    const key = String(inv.campaign_id);
    if (!statsMap.has(key)) {
      statsMap.set(key, { amount_pledged: 0, investors: new Set() });
    }
    const entry = statsMap.get(key)!;
    entry.amount_pledged += parseFloat(inv.amount ?? "0") || 0;
    if (inv.investor_id) {
      entry.investors.add(String(inv.investor_id));
    }
  }

  return campaigns.map((campaign) => {
    const stat = statsMap.get(String(campaign.id));
    return {
      ...campaign,
      amount_pledged: stat
        ? String(stat.amount_pledged)
        : String(campaign.amount_pledged ?? "0"),
      investor_count: stat
        ? stat.investors.size
        : Number(campaign.investor_count ?? 0),
    };
  });
}

// shafqaat — Fetch all active campaigns for the public homepage
// Returns an array of campaigns or empty array on error
export async function getAllCampaigns() {
  const supabase = createClient();

  try {
    // Fetch all fields from campaigns table
    const { data, error } = await supabase
      .from("campaigns")
      .select(`*`)
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("[getAllCampaigns] Supabase error:", error);
      return [];
    }

    console.log("[getAllCampaigns] Fetched campaigns:", data?.length || 0);
    if (data && data.length > 0) {
      console.log("[getAllCampaigns] First campaign raw:", data[0]);
      console.log(
        "[getAllCampaigns] First campaign normalized:",
        normalizeCampaign(data[0]),
      );
    }

    // Normalize campaign data to ensure consistent field names
    const normalized = (data ?? []).map(normalizeCampaign);
    return await attachCampaignStats(normalized);
  } catch (err) {
    console.error("[getAllCampaigns] Exception:", err);
    return [];
  }
}

// shafqaat — Fetch a single campaign by its Supabase ID (for detail page)
export async function getCampaignById(id: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select(`*`)
      .eq("id", id)
      .single();

    if (error) {
      console.error("[getCampaignById] Supabase error:", error);
      return null;
    }

    // Normalize the campaign data
    if (!data) return null;
    const [campaignWithStats] = await attachCampaignStats([
      normalizeCampaign(data),
    ]);
    return campaignWithStats;
  } catch (err) {
    console.error("[getCampaignById] Exception:", err);
    return null;
  }
}

// shafqaat — Fetch campaigns filtered by category
export async function getCampaignsByCategory(category: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select(`*`)
      .eq("category", category.toLowerCase())
      .eq("status", "launched")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCampaignsByCategory] error:", error.message);
      return [];
    }

    const normalized = (data ?? []).map(normalizeCampaign);
    return await attachCampaignStats(normalized);
  } catch (err) {
    console.error("[getCampaignsByCategory] Exception:", err);
    return [];
  }
}

// Returns personalized campaigns for signed-in users and the public fallback for guests.
export async function getRecommendedCampaigns(
  limit: number = 2,
  categoryDistribution?: Record<string, number>,
  userBackedCampaignIds?: (string | number)[],
) {
  const supabase = createClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      session &&
      (categoryDistribution !== undefined ||
        userBackedCampaignIds !== undefined)
    ) {
      const backedIds = (userBackedCampaignIds ?? []).map(String);
      let investorRiskScore: number | null = null;

      if (backedIds.length > 0) {
        const { data: backedCampaigns, error: backedCampaignsError } =
          await supabase
            .from("campaigns")
            .select("id, risk_score")
            .in("id", backedIds);

        if (backedCampaignsError) {
          console.error(
            "[getRecommendedCampaigns] Backed campaign risk query error:",
            backedCampaignsError,
          );
        } else {
          const riskScores = (backedCampaigns ?? [])
            .map((campaign) => Number(campaign.risk_score))
            .filter(Number.isFinite);

          if (riskScores.length > 0) {
            investorRiskScore =
              riskScores.reduce((sum, score) => sum + score, 0) /
              riskScores.length;
          }
        }
      }

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "launched")
        .order("created_at", { ascending: false });

      if (error || !data) {
        if (error) {
          console.error("[getRecommendedCampaigns] Supabase error:", error);
        }
        return [];
      }

      const normalized = await attachCampaignStats(data.map(normalizeCampaign));
      const backedIdSet = new Set(backedIds);
      const normalizedCategoryDistribution = Object.entries(
        categoryDistribution ?? {},
      ).reduce<Record<string, number>>((distribution, [category, weight]) => {
        distribution[category.toLowerCase()] = Number(weight) || 0;
        return distribution;
      }, {});

      const scored = normalized
        .filter((campaign) => !backedIdSet.has(String(campaign.id)))
        .map((campaign) => {
          const categoryWeight =
            normalizedCategoryDistribution[
              String(campaign.category ?? "").toLowerCase()
            ] ?? 0;
          const categoryScore = Math.min(60, Math.max(0, categoryWeight * 60));
          const campaignRiskScore = Number(campaign.risk_score);
          const hasRiskMatch =
            investorRiskScore !== null &&
            Number.isFinite(campaignRiskScore) &&
            (investorRiskScore >= 5) === (campaignRiskScore >= 5);
          const riskScore = hasRiskMatch ? 40 : 0;
          const matchScore = Math.round(categoryScore + riskScore);

          console.log(
            `[getRecommendedCampaigns] Campaign "${campaign.title}" match score: ${matchScore}`,
          );

          return { ...campaign, matchScore };
        })
        .filter((campaign) => campaign.matchScore >= 40)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4);

      return scored;
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "launched")
      .order("created_at", { ascending: false })
      .limit(20); // fetch 20, score them, return top `limit`

    if (error || !data) return [];

    // Normalize campaigns
    const normalized = await attachCampaignStats(data.map(normalizeCampaign));

    // shafqaat — Scoring algorithm:
    // Score = recency bonus + goal size bonus
    // Recency: campaigns created within last 7 days get +50 points, 8-14 days get +30, older +10
    // Goal: higher ETH goals get more points (signals serious projects)
    const now = Date.now();
    const scored = normalized.map((c) => {
      const ageInDays =
        (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = ageInDays <= 7 ? 50 : ageInDays <= 14 ? 30 : 10;
      // shafqaat — parse goal safely (stored as ETH string e.g. "1.5"), cap at 40 pts, NaN → 0
      const parsedGoal = parseFloat(c.funding_goal ?? "0");
      const goalScore = Math.min(isNaN(parsedGoal) ? 0 : parsedGoal * 2, 40);
      return { ...c, _score: recencyScore + goalScore };
    });

    // shafqaat — Sort by score descending, return top N
    return scored.sort((a, b) => b._score - a._score).slice(0, limit);
  } catch (err) {
    console.error("[getRecommendedCampaigns] Exception:", err);
    return [];
  }
}

// shafqaat — Featured campaigns: newest campaigns with images (for the "Feature Projects" panel)
export async function getFeaturedCampaigns(limit: number = 4) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "launched")
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const normalized = data.map(normalizeCampaign);
    return await attachCampaignStats(normalized);
  } catch (err) {
    console.error("[getFeaturedCampaigns] Exception:", err);
    return [];
  }
}

// shafqaat — Fetch all campaigns created by the currently logged-in user
// Used by the creator dashboard to show "My Campaigns"
export async function getMyCampaigns() {
  const supabase = createClient();

  try {
    // shafqaat — Get the authenticated user first
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("campaigns")
      .select(`*`)
      .eq("owner", user.id) // shafqaat — only campaigns this user owns
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMyCampaigns] Supabase error:", error.message);
      return [];
    }

    const normalized = (data ?? []).map(normalizeCampaign);

    const { data: reviews, error: reviewsError } = await supabase
      .from("campaign_reviews")
      .select(
        "campaign_id, action, rejection_reason, internal_notes, created_at",
      )
      .in(
        "campaign_id",
        normalized.map((campaign) => campaign.id),
      )
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error(
        "[getMyCampaigns] Review lookup error:",
        reviewsError.message,
      );
    }

    const latestReviews = new Map();
    for (const review of reviews ?? []) {
      if (!latestReviews.has(String(review.campaign_id))) {
        latestReviews.set(String(review.campaign_id), review);
      }
    }

    const campaignsWithReviews = normalized.map((campaign) => ({
      ...campaign,
      campaign_review: latestReviews.get(String(campaign.id)) ?? null,
    }));

    return await attachCampaignStats(campaignsWithReviews);
  } catch (err) {
    console.error("[getMyCampaigns] Exception:", err);
    return [];
  }
}

export async function getLaunchedCampaigns() {
  const supabase = createClient();

  try {
    // Fetch all fields from campaigns table
    const { data, error } = await supabase
      .from("campaigns")
      .select(`*`)
      .eq("status", "launched") // only launched campaignns
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("[getAllCampaigns] Supabase error:", error);
      return [];
    }

    if (data && data.length > 0) {
      console.log("[getAllCampaigns] First campaign raw:", data[0]);
      console.log(
        "[getAllCampaigns] First campaign normalized:",
        normalizeCampaign(data[0]),
      );
    }

    // Normalize campaign data to ensure consistent field names
    const normalized = (data ?? []).map(normalizeCampaign);
    return await attachCampaignStats(normalized);
  } catch (err) {
    console.error("[getAllCampaigns] Exception:", err);
    return [];
  }
}
