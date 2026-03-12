// shafqaat — Supabase data-fetching utilities for campaigns
import { createClient } from "@/utils/supabase/client";

// shafqaat — Fetch all active campaigns for the public homepage
// Returns an array of campaigns or empty array on error
export async function getAllCampaigns() {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("campaigns")
        .select(`
      id,
      title,
      description,
      funding_goal,
      duration,
      category,
      image_url,
      transaction_hash,
      price_per_token,
      created_at,
      owner
    `)
        .order("created_at", { ascending: false }); // newest first

    if (error) {
        console.error("[getAllCampaigns] Supabase error:", error.message);
        return [];
    }

    return data ?? [];
}

// shafqaat — Fetch a single campaign by its Supabase ID (for detail page)
export async function getCampaignById(id: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("campaigns")
        .select(`
      id,
      title,
      description,
      funding_goal,
      duration,
      category,
      image_url,
      transaction_hash,
      price_per_token,
      pitch_deck_url,
      business_plan_url,
      financials_url,
      use_of_funds_url,
      product_demo_url,
      created_at,
      owner
    `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("[getCampaignById] Supabase error:", error.message);
        return null;
    }

    return data;
}

// shafqaat — Fetch campaigns filtered by category
export async function getCampaignsByCategory(category: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("campaigns")
        .select(`
      id, title, description, funding_goal,
      duration, category, image_url, created_at
    `)
        .eq("category", category.toLowerCase())
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getCampaignsByCategory] error:", error.message);
        return [];
    }

    return data ?? [];
}

// shafqaat — Recommendation algorithm: scores campaigns by recency + goal size
// Returns top N campaigns sorted by a computed score
export async function getRecommendedCampaigns(limit: number = 2) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, description, funding_goal, duration, category, image_url, created_at, price_per_token")
        .order("created_at", { ascending: false })
        .limit(20); // fetch 20, score them, return top `limit`

    if (error || !data) return [];

    // shafqaat — Scoring algorithm:
    // Score = recency bonus + goal size bonus
    // Recency: campaigns created within last 7 days get +50 points, 8-14 days get +30, older +10
    // Goal: higher ETH goals get more points (signals serious projects)
    const now = Date.now();
    const scored = data.map((c) => {
        const ageInDays = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = ageInDays <= 7 ? 50 : ageInDays <= 14 ? 30 : 10;
        // shafqaat — parse goal safely (stored as ETH string e.g. "1.5"), cap at 40 pts, NaN → 0
        const parsedGoal = parseFloat(c.funding_goal ?? "0");
        const goalScore = Math.min(isNaN(parsedGoal) ? 0 : parsedGoal * 2, 40);
        return { ...c, _score: recencyScore + goalScore };
    });

    // shafqaat — Sort by score descending, return top N
    return scored
        .sort((a, b) => b._score - a._score)
        .slice(0, limit);
}

// shafqaat — Featured campaigns: newest campaigns with images (for the "Feature Projects" panel)
export async function getFeaturedCampaigns(limit: number = 4) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, description, funding_goal, duration, category, image_url, created_at")
        .not("image_url", "is", null)       // shafqaat — exclude NULL image_url
        .neq("image_url", "")               // shafqaat — also exclude empty string
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return data;
}

// shafqaat — Fetch all campaigns created by the currently logged-in user
// Used by the creator dashboard to show "My Campaigns"
export async function getMyCampaigns() {
    const supabase = createClient();

    // shafqaat — Get the authenticated user first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("campaigns")
        .select(`
            id,
            title,
            description,
            funding_goal,
            duration,
            category,
            image_url,
            transaction_hash,
            price_per_token,
            created_at,
            owner
        `)
        .eq("owner", user.id)               // shafqaat — only campaigns this user owns
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getMyCampaigns] Supabase error:", error.message);
        return [];
    }

    return data ?? [];
}
