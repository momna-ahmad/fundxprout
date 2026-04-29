//action.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Helper: convert a Pinata CID to a public gateway URL
const cidToUrl = (cid: string | null | undefined) =>
  cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;

type AppRole = "owner" | "investor";

const normalizeRole = (role: string | null | undefined): AppRole | null => {
  const value = (role || "").trim().toLowerCase();
  if (value === "owner" || value === "business_owner") return "owner";
  if (value === "investor") return "investor";
  return null;
};

const getRoleRedirect = (role: AppRole) =>
  role === "owner" ? "/dashboard" : "/investor-dashboard/overview";

const deriveFullName = (user: any) => {
  const fromMetadata =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim();

  if (fromMetadata && fromMetadata.trim()) return fromMetadata.trim();
  if (user?.email) return user.email.split("@")[0];
  return "User";
};

// 1. Google Login Action
export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Redirect to the callback route we created in Step 4
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (data.url) {
    redirect(data.url); // Send user to Google
  }
}

export async function completeOAuthSignIn() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, error: "Unable to resolve signed-in user" };
  }

  if (!user.id) {
    return { ok: false, error: "Unable to resolve signed-in user" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profileError?.code === "PGRST116") {
    return { ok: true, redirectTo: "/auth/select-role" };
  }

  if (profileError) {
    return { ok: false, error: "Unable to read user profile" };
  }

  const roleFromProfile = normalizeRole(profile?.role);
  if (!roleFromProfile) {
    return { ok: true, redirectTo: "/auth/select-role" };
  }

  return {
    ok: true,
    redirectTo: getRoleRedirect(roleFromProfile),
  };
}

export async function saveRoleFromProfileForm(
  prevState: { error?: string },
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "You must be signed in to continue." };
  }

  const role = normalizeRole(formData.get("role") as string);
  if (!role) {
    return { error: "Please choose Owner or Investor." };
  }

  const fullName =
    ((formData.get("fullName") as string) || "").trim() || deriveFullName(user);

  const { error: profileError } = await supabase.from("profiles").upsert(
    [
      {
        user_id: user.id,
        role,
        full_name: fullName,
      },
    ],
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { error: "Failed to save role. Please try again." };
  }

  await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata || {}),
      user_role: role,
      full_name: fullName,
    },
  });

  redirect(getRoleRedirect(role));
}

// 2. Email Login Action
export async function login(prevState: string | undefined, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log(error);

  if (error) {
    return "Invalid credentials"; // Return error to frontend
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return "Unable to load user session";
  }

  const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

  if (profileError?.code === "PGRST116") {
    redirect("/auth/select-role");
  }

  if (profileError) {
    return "Unable to load profile";
  }

  const roleFromProfile = normalizeRole(profile?.role);
  if (!roleFromProfile) {
    redirect("/auth/select-role");
  }

  redirect(getRoleRedirect(roleFromProfile));
}

export async function signup(
  prevState: { error: string | undefined },
  formData: FormData,
) {
  const supabase = await createClient();

  // 1. Get form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const userRole = formData.get("userRole") as string;

  // 2. Validate role
  const normalizedRole = normalizeRole(userRole);
  if (!normalizedRole) {
    return { error: "Please select a valid account type" };
  }

  // 3. Determine the "Redirect URL" for email confirmation
  // We need to tell Supabase where to send the user after they click the link in their email.
  const origin = (await headers()).get("origin");

  // 4. Call Supabase Sign Up
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This ensures they come back to YOUR site, not Supabase's default
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        user_role: normalizedRole, // Store role in auth metadata
      },
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return { error: error.message };
  }

  // 5. Insert user profile row with user_id, full_name, and role
  if (authData?.user?.id) {
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        user_id: authData.user.id,
        full_name: fullName,
        role: normalizedRole,
      },
    ]);

    if (profileError) {
      console.error("[signup] Profile insert error:", profileError.message);
      // Don't fail signup if profile insert fails, just log it
    }
  }

  // 6. Redirect based on role
  redirect(getRoleRedirect(normalizedRole));
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
async function ensureUserProfileExists(supabase: any, userId: string) {
  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  if (!existingProfile) {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert([{ user_id: userId }], { onConflict: "user_id" });

    if (upsertError) {
      throw upsertError;
    }
  }
}

export async function saveCampaignToDb(formData: any) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await ensureUserProfileExists(supabase, user.id);

  // Build the row — store both the raw CID and the clickable IPFS gateway URL
  const row = {
    title: formData.title,
    description: formData.description,
    funding_goal: formData.goal,
    duration: formData.duration,
    category: formData.category,
    owner: user.id,
    status: "launched",
    transaction_hash: formData.txHash,
    contract_address: formData.contractAddress ?? null, // ✅ add this
    price_per_token: formData.pricePerToken,
    image_url: formData.imageUrl ?? null,
    // ── IPFS CIDs (raw hash for on-chain verification) ─────────────
    pitch_deck_cid: formData.pitchDeckCid ?? null,
    business_plan_cid: formData.businessPlanCid ?? null,
    financials_cid: formData.financialsCid ?? null,
    use_of_funds_cid: formData.useOfFundsCid ?? null,
    product_demo_cid: formData.productDemoCid ?? null,
    // ── IPFS gateway URLs (human-readable, clickable links) ─────────
    pitch_deck_url: cidToUrl(formData.pitchDeckCid),
    business_plan_url: cidToUrl(formData.businessPlanCid),
    financials_url: cidToUrl(formData.financialsCid),
    use_of_funds_url: cidToUrl(formData.useOfFundsCid),
    product_demo_url: cidToUrl(formData.productDemoCid),
  };

  console.log(
    "[saveCampaignToDb] Inserting row:",
    JSON.stringify(row, null, 2),
  );

  const { data, error } = await supabase
    .from("campaigns")
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error("[saveCampaignToDb] Supabase error:", error.message);
    if (error.message?.includes("campaigns_owner_fkey")) {
      return {
        error:
          "Unable to save campaign: your Supabase profile record is missing. Please complete your creator profile first.",
      };
    }
    return { error: error.message };
  }

  console.log("[saveCampaignToDb] Saved campaign id:", data?.id);
  return { success: true, campaignId: data?.id };
}

// shafqaat — Save/update creator profile (KYC + KYB + basic info)
// Uses UPSERT so it works for both first-time create and subsequent updates
// Save Draft Campaign (without blockchain deployment)
export async function saveDraftCampaign(draftData: any) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await ensureUserProfileExists(supabase, user.id);

  // Build the row for draft campaign
  const row = {
    title: draftData.title,
    description: draftData.description,
    funding_goal: draftData.goal,
    duration: draftData.duration,
    category: draftData.category,
    owner: user.id,
    image_url: draftData.imageUrl ?? null,
    status: "draft", // Mark as draft
    // ── IPFS CIDs (optional for drafts) ─────────────
    // pitch_deck_cid: draftData.pitchDeckCid ?? null,
    // business_plan_cid: draftData.businessPlanCid ?? null,
    // financials_cid: draftData.financialsCid ?? null,
    // use_of_funds_cid: draftData.useOfFundsCid ?? null,
    // product_demo_cid: draftData.productDemoCid ?? null,
    // ── IPFS gateway URLs ─────────────────────────
    // pitch_deck_url: cidToUrl(draftData.pitchDeckCid),
    // business_plan_url: cidToUrl(draftData.businessPlanCid),
    // financials_url: cidToUrl(draftData.financialsCid),
    // use_of_funds_url: cidToUrl(draftData.useOfFundsCid),
    // product_demo_url: cidToUrl(draftData.productDemoCid),
  };

  // When editing an existing draft, update that row instead of inserting a new one
  if (draftData.campaignId) {
    console.log(
      "[saveDraftCampaign] Updating draft row:",
      JSON.stringify(row, null, 2),
    );

    const { error } = await supabase
      .from("campaigns")
      .update(row)
      .eq("id", draftData.campaignId)
      .eq("owner", user.id);

    if (error) {
      console.error("[saveDraftCampaign] Supabase update error:", error.message);
      return { error: error.message };
    }

    console.log("[saveDraftCampaign] Updated draft campaign id:", draftData.campaignId);
    return { success: true, campaignId: draftData.campaignId };
  }

  console.log(
    "[saveDraftCampaign] Inserting draft row:",
    JSON.stringify(row, null, 2),
  );

  const { data, error } = await supabase
    .from("campaigns")
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error("[saveDraftCampaign] Supabase error:", error.message);
    if (error.message?.includes("campaigns_owner_fkey")) {
      return {
        error:
          "Unable to save draft: your Supabase profile record is missing. Please complete your creator profile first.",
      };
    }
    return { error: error.message };
  }

  console.log("[saveDraftCampaign] Saved draft campaign id:", data?.id);
  return { success: true, campaignId: data?.id };
}

export async function saveCreatorProfile(profileData: any) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get user role from auth metadata
  const userRole = normalizeRole(user.user_metadata?.user_role) || "investor";

  // shafqaat — Helper to convert CID to full Pinata gateway URL
  const cidToUrl = (cid: string | null | undefined) =>
    cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;

  const row = {
    user_id: user.id,
    role: userRole,
    // Basic info
    full_name: profileData.full_name ?? null,
    display_name: profileData.display_name ?? null,
    bio: profileData.bio ?? null,
    phone: profileData.phone ?? null,
    country: profileData.country ?? null,
    city: profileData.city ?? null,
    website_url: profileData.website_url ?? null,
    linkedin_url: profileData.linkedin_url ?? null,
    // KYC — raw CIDs + gateway URLs
    national_id_cid: profileData.national_id_cid ?? null,
    national_id_url: cidToUrl(profileData.national_id_cid),
    passport_cid: profileData.passport_cid ?? null,
    passport_url: cidToUrl(profileData.passport_cid),
    selfie_cid: profileData.selfie_cid ?? null,
    selfie_url: cidToUrl(profileData.selfie_cid),
    proof_of_address_cid: profileData.proof_of_address_cid ?? null,
    proof_of_address_url: cidToUrl(profileData.proof_of_address_cid),
    // KYB
    business_reg_cid: profileData.business_reg_cid ?? null,
    business_reg_url: cidToUrl(profileData.business_reg_cid),
    tax_cert_cid: profileData.tax_cert_cid ?? null,
    tax_cert_url: cidToUrl(profileData.tax_cert_cid),
    bank_statement_cid: profileData.bank_statement_cid ?? null,
    bank_statement_url: cidToUrl(profileData.bank_statement_cid),
    business_logo_url: profileData.business_logo_url ?? null,
    // shafqaat — Mark profile complete if core KYC fields are filled
    profile_complete: !!(
      profileData.full_name &&
      profileData.national_id_cid &&
      profileData.selfie_cid
    ),
    updated_at: new Date().toISOString(),
  };

  // shafqaat — Upsert into the existing 'profiles' table (not creator_profiles)
  const { error } = await supabase
    .from("profiles")
    .upsert([row], { onConflict: "user_id" });

  if (error) {
    console.error("[saveCreatorProfile] Supabase error:", error.message);
    return { error: error.message };
  }

  return { success: true };
}
