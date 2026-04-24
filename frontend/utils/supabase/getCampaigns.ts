// shafqaat — Supabase data-fetching utilities for campaigns
import { createClient } from "@/utils/supabase/client";

// Helper function to normalize campaign data from various possible field names
function normalizeCampaign(raw: any) {
    return {
        ...raw,              // ✅ spread FIRST so explicit fields below win
        id: raw.id,
        title: raw.title,
        description: raw.description,
        funding_goal: raw.funding_goal || raw.goal_amount || raw.goal || "0",
        duration: raw.duration || raw.duration_days || 30,
        category: raw.category,
        image_url: raw.image_url || raw.image_hash || null,
        transaction_hash: raw.transaction_hash || raw.tx_hash || null,
        price_per_token: raw.price_per_token || "0",
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
        problem_statement: raw.problem_statement ?? null,
        proof_of_capability: raw.proof_of_capability ?? null,
        idea_clarity: raw.idea_clarity ?? null,
        differentiation: raw.differentiation ?? null,
        gtm_strategy: raw.gtm_strategy ?? null,
        business_model: raw.business_model ?? null,
        vagueness: raw.vagueness ?? null,
        credibility: raw.credibility ?? null,
    };
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
            console.log("[getAllCampaigns] First campaign normalized:", normalizeCampaign(data[0]));
        }
        
        // Normalize campaign data to ensure consistent field names
        const normalized = (data ?? []).map(normalizeCampaign);
        return normalized;
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
        return data ? normalizeCampaign(data) : null;
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
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[getCampaignsByCategory] error:", error.message);
            return [];
        }

        return (data ?? []).map(normalizeCampaign);
    } catch (err) {
        console.error("[getCampaignsByCategory] Exception:", err);
        return [];
    }
}

// shafqaat — Recommendation algorithm: scores campaigns by recency + goal size
// Returns top N campaigns sorted by a computed score
export async function getRecommendedCampaigns(limit: number = 2) {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from("campaigns")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20); // fetch 20, score them, return top `limit`

        if (error || !data) return [];

        // Normalize campaigns
        const normalized = data.map(normalizeCampaign);

        // shafqaat — Scoring algorithm:
        // Score = recency bonus + goal size bonus
        // Recency: campaigns created within last 7 days get +50 points, 8-14 days get +30, older +10
        // Goal: higher ETH goals get more points (signals serious projects)
        const now = Date.now();
        const scored = normalized.map((c) => {
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
            .not("image_url", "is", null)       // shafqaat — exclude NULL image_url
            .neq("image_url", "")               // shafqaat — also exclude empty string
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        
        return data.map(normalizeCampaign);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from("campaigns")
            .select(`*`)
            .eq("owner", user.id)               // shafqaat — only campaigns this user owns
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[getMyCampaigns] Supabase error:", error.message);
            return [];
        }

        return (data ?? []).map(normalizeCampaign);
    } catch (err) {
        console.error("[getMyCampaigns] Exception:", err);
        return [];
    }
}
