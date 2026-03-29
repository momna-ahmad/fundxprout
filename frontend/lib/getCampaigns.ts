// frontend/lib/getCampaigns.ts
//this file fetches the created campaigns from the database and returns them to the frontend
"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for server actions
);

export type Campaign = {
  id: string;
  title: string;
  description: string;
  goal: string;
  duration: number;
  category: string;
  tx_hash: string;
  price_per_token: string;
  contract_address: string;   // make sure this column exists in your table
  amount_raised: string;      // can be updated later via on-chain reads
  deadline: string;           // ISO timestamp — store when saving: new Date(Date.now() + duration * 86400000).toISOString()
  image_url: string | null;
  created_at: string;
};

/** Fetch all campaigns, newest first */
export async function getAllCampaigns(): Promise<{
  data: Campaign[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** Fetch a single campaign by id */
export async function getCampaignById(id: string): Promise<{
  data: Campaign | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Supabase fetch error:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** Filter campaigns by category */
export async function getCampaignsByCategory(category: string): Promise<{
  data: Campaign[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}