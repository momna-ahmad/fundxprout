"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Helper: convert a Pinata CID to a public gateway URL
const cidToUrl = (cid: string | null | undefined) =>
  cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;

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

  redirect("/dashboard");
}

export async function signup(
  prevState: { error: string | undefined },
  formData: FormData,
) {
  const supabase = await createClient();

  // 1. Get form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string; // Optional: if you want their name

  // 2. Determine the "Redirect URL" for email confirmation
  // We need to tell Supabase where to send the user after they click the link in their email.
  const origin = (await headers()).get("origin");

  // 3. Call Supabase Sign Up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This ensures they come back to YOUR site, not Supabase's default
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName, // This saves to 'raw_user_meta_data'
      },
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return { error: error.message };
  }

  // 4. Redirect to a "Check your email" page
  redirect("/dashboard");
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
export async function saveCampaignToDb(formData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Build the row — store both the raw CID and the clickable IPFS gateway URL
  const row = {
    title: formData.title,
    description: formData.description,
    funding_goal: formData.goal,
    duration: formData.duration,
    category: formData.category,
    owner: user.id,
    transaction_hash: formData.txHash,
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

  console.log("[saveCampaignToDb] Inserting row:", JSON.stringify(row, null, 2));

  const { data, error } = await supabase.from("campaigns").insert([row]).select().single();

  if (error) {
    console.error("[saveCampaignToDb] Supabase error:", error.message);
    return { error: error.message };
  }

  console.log("[saveCampaignToDb] Saved campaign id:", data?.id);
  return { success: true, campaignId: data?.id };
}

// shafqaat — Save/update creator profile (KYC + KYB + basic info)
// Uses UPSERT so it works for both first-time create and subsequent updates
export async function saveCreatorProfile(profileData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // shafqaat — Helper to convert CID to full Pinata gateway URL
  const cidToUrl = (cid: string | null | undefined) =>
    cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;

  const row = {
    user_id: user.id,
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
