// shafqaat — Utility functions to fetch transactions from Supabase investments table
import { createClient } from "@/utils/supabase/client";

// Fetch all transactions for the current user
export async function getUserTransactions() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("investments")
      .select(`
        *,
        campaign:campaigns(title, category)
      `)
      .eq("investor_id", user.id)
      .order("invested_at", { ascending: false });

    if (error) {
      console.error("[getUserTransactions] Supabase error:", error);
      return [];
    }

    // Transform investments to transaction format
    return (data ?? []).map((inv) => ({
      id: String(inv.id),
      hash: inv.transaction_hash || "N/A",
      type: "Buy" as const,
      tokenSymbol: inv.campaign?.title?.split(" ")[0] || "TOKEN",
      tokenAmount: inv.equity_tokens || 0,
      valueUSD: inv.amount || 0,
      date: inv.invested_at || new Date().toISOString(),
      status: "Confirmed" as const,
      from: inv.investor_address,
      to: inv.campaign_id ? `Campaign ${inv.campaign_id}` : "N/A",
    }));
  } catch (err) {
    console.error("[getUserTransactions] Exception:", err);
    return [];
  }
}

// Fetch a single transaction by ID
export async function getTransactionById(transactionId: string) {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("investments")
      .select(`
        *,
        campaign:campaigns(id, title, category, description, contract_address)
      `)
      .eq("id", transactionId)
      .eq("investor_id", user.id)
      .single();

    if (error) {
      console.error("[getTransactionById] Supabase error:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[getTransactionById] Exception:", err);
    return null;
  }
}

// Get transaction statistics for a user
export async function getTransactionStats() {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("investments")
      .select("amount, status")
      .eq("investor_id", user.id)
      .eq("status", "completed");

    if (error) {
      console.error("[getTransactionStats] Supabase error:", error);
      return null;
    }

    const transactions = data ?? [];
    const totalVolume = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const confirmedCount = transactions.filter(t => t.status === "completed").length;

    return {
      totalVolume,
      confirmedCount,
      totalTransactions: transactions.length,
    };
  } catch (err) {
    console.error("[getTransactionStats] Exception:", err);
    return null;
  }
}

// Filter transactions by type (all are "Buy" in current implementation, but this is extensible)
export function filterTransactionsByType(
  transactions: any[],
  type: "All" | "Buy" | "Sell" | "Transfer" | "Stake" | "Dividend"
) {
  if (type === "All") return transactions;
  return transactions.filter(t => t.type === type);
}

// Filter transactions by status
export function filterTransactionsByStatus(
  transactions: any[],
  status: "All" | "Confirmed" | "Pending" | "Failed"
) {
  if (status === "All") return transactions;
  return transactions.filter(t => t.status === status);
}

// Search transactions by hash or token symbol
export function searchTransactions(
  transactions: any[],
  query: string
) {
  if (!query) return transactions;
  const lowerQuery = query.toLowerCase();
  return transactions.filter(
    t =>
      t.hash.toLowerCase().includes(lowerQuery) ||
      t.tokenSymbol.toLowerCase().includes(lowerQuery)
  );
}
