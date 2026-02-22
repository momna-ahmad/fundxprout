"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ethers } from "ethers";
import CampaignFactoryJSON from "@/abis/CampaignFactory.json";

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
  console.log("save to db funciton ");

  // Get user to ensure they are authorized
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  console.log(user);

  const { data, error } = await supabase.from("campaigns").insert([
    {
      title: formData.title,
      description: formData.description,
      funding_goal: formData.goal, // Store as ETH or Wei string
      duration: formData.duration,
      category: formData.category,
      owner: user.id, // The UUID from auth
      transaction_hash: formData.txHash,
      price_per_token: formData.pricePerToken,
    },
  ]);

  if (error) return { error: error.message };
  return { success: true };
}
