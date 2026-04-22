// shafqaat — Profile utilities: reads/writes to the existing 'profiles' table in Supabase
import { createClient } from "@/utils/supabase/client";

const normalizeRole = (role?: string | null) => {
    const value = (role || "").trim().toLowerCase();
    if (value === "owner" || value === "business_owner") return "owner";
    if (value === "investor") return "investor";
    return null;
};

// shafqaat — Get user role from auth metadata
export async function getUserRole() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const metadataRole = normalizeRole(user.user_metadata?.user_role);
    if (metadataRole) return metadataRole;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    return normalizeRole(profile?.role) || 'investor';
}

// shafqaat — Fetch the profile row for the currently logged-in user
// Queries the existing 'profiles' table (already in Supabase)
export async function getMyProfile() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")          // shafqaat — use the existing profiles table
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (error) {
        // shafqaat — PGRST116 = no row found (first-time user), ignore this error
        if (error.code !== "PGRST116") {
            console.error("[getMyProfile] Supabase error:", error.message);
        }
        return null;
    }

    return data;
}

// shafqaat — Calculate profile completion % based on filled fields
// Returns 0-100 based on how many key fields are non-empty
export function calcProfileCompletion(profile: Record<string, any> | null): number {
    if (!profile) return 0;

    // shafqaat — Fields that count toward completion
    const fields = [
        profile.full_name,
        profile.display_name,
        profile.bio,
        profile.phone,
        profile.country,
        profile.national_id_cid,
        profile.selfie_cid,
        profile.proof_of_address_cid,
        profile.business_reg_cid,
        profile.tax_cert_cid,
        profile.bank_statement_cid,
        profile.business_logo_url,
        profile.website_url,
    ];

    const filled = fields.filter((f) => f && String(f).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
}
