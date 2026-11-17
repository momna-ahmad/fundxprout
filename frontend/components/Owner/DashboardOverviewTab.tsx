"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Target, ChevronLeft, ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import { ethers } from "ethers";
import BusinessCampaignJSON from "@/abis/BusinessCampaign.json";
import { logTransaction } from "@/utils/investmentUtils";
import { createClient } from "@/utils/supabase/client";
import { calcDaysLeft } from "@/components/campaign-card";

export interface CampaignItem {
  id: string | number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  status: string;
  funding_goal?: string | number | null;
  amount_pledged?: string | number | null;
  investor_count?: number | string | null;
  price_per_token?: string | number | null;
  created_at: string;
  deadline: string;
  duration?: number | null;
  contract_address?: string | null;
  transaction_hash?: string | null;
  valuation?: string | number | null;
  equity_offered?: string | number | null;
  equity_retained?: string | number | null;
  campaign_review?: any;
  funds_withdrawn?: boolean | null;
}

interface DashboardOverviewTabProps {
  campaigns?: CampaignItem[];
  loading?: boolean;
}

function getStatusStyle(status?: string): { bg: string; text: string; label: string } {
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Draft" },
    in_review: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "In Review" },
    approved: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Approved" },
    launched: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Launched" },
    ended: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Ended" },
    successful: { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "Successful" },
    failed: { bg: "bg-red-500/15", text: "text-red-300", label: "Failed" },
    rejected: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Rejected" },
  };

  return (
    statusMap[status?.toLowerCase() ?? ""] || {
      bg: "bg-white/10",
      text: "text-gray-400",
      label: status || "Unknown",
    }
  );
}

export default function DashboardOverviewTab({
  campaigns = [],
  loading = false,
}: DashboardOverviewTabProps) {
  const [txPending, setTxPending] = useState<string | null>(null);
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const ITEMS_PER_PAGE = 10;

  const overviewCampaigns = campaigns.filter((campaign) =>
    ["launched", "successful", "failed"].includes(campaign.status?.toLowerCase() ?? ""),
  );
  const filteredCampaigns = overviewCampaigns.filter((campaign) => {
    const matchesStatus = statusFilter === "all" || campaign.status?.toLowerCase() === statusFilter;
    return matchesStatus;
  });
  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE);
  const paginated = filteredCampaigns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  async function handleWithdrawFunds(campaign: CampaignItem) {
  if (!campaign.contract_address) return;
  if (typeof window === "undefined" || !(window as any).ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    setTxPending(String(campaign.id));

    // 1. Get logged-in user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to withdraw funds.");
      return;
    }

    // 2. Connect MetaMask Signer
    await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    const campaignContract = new ethers.Contract(
      campaign.contract_address,
      BusinessCampaignJSON.abi,
      signer
    );

    // 3. Trigger smart contract withdrawal
    const tx = await campaignContract.withdrawFunds();
    alert(`Withdrawal transaction submitted! Hash: ${tx.hash}`);

    // 4. Wait for on-chain confirmation
    const receipt = await tx.wait();

    if (receipt && receipt.status === 1) {
      const withdrawAmount = parseFloat(String(campaign.amount_pledged ?? "0"));

      // 5. Log the transaction in the database
      try {
        await logTransaction({
          userId: user.id,
          campaignId: campaign.id,
          type: "withdrawal",
          txHash: receipt.hash,
          quantity: withdrawAmount,
          token: "ETH" as any, // Cast if token type is strictly number in your definitions
        });
      } catch (logErr) {
        console.error("Failed to log transaction:", logErr);
      }

      // 6. Update funds_withdrawn in campaigns table
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          funds_withdrawn: true,
          withdrawn_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      if (updateError) {
        console.error("Failed to update campaign status:", updateError);
      }

      alert("Funds successfully withdrawn to your wallet!");
      window.location.reload();
    }
  } catch (err: any) {
    console.error("Withdrawal error:", err);
    alert(err.reason || err.message || "Withdrawal failed");
  } finally {
    setTxPending(null);
  }
}

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Campaign Overview</h2>
          <p className="mt-1 text-sm text-gray-400">Review campaign performance and manage active projects.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!loading && overviewCampaigns.length > 0 && (
            <label>
              <span className="sr-only">Filter campaigns by status</span>
              <select
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border border-white/10 bg-[#1e2530] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#6f42c1]/30 sm:w-40"
              >
                <option value="all">All statuses</option>
                <option value="launched">Launched</option>
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          )}
          <Link
            href="/create-campaign"
            className="w-full sm:w-fit rounded-xl border border-[#8b6bd1]/40 bg-[#6f42c1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a3599] inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="text-center py-16">
          <Target className="h-10 w-10 text-[#6f42c1]/30 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            You haven't created any campaigns yet.
          </p>
          <Link
            href="/create-campaign"
            className="mt-3 inline-block text-[#a78bfa] text-sm hover:underline"
          >
            Create your first campaign →
          </Link>
        </div>
      )}

      {!loading && campaigns.length > 0 && overviewCampaigns.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#1e2530] px-5 py-10 text-center">
          <p className="text-sm font-medium text-gray-300">No launched, successful, or failed campaigns yet.</p>
        </div>
      )}

      {!loading && overviewCampaigns.length > 0 && filteredCampaigns.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#1e2530] px-5 py-10 text-center">
          <p className="text-sm font-medium text-gray-300">No campaigns match these filters.</p>
          <button type="button" onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} className="mt-2 text-sm font-medium text-[#a78bfa] hover:text-white">Show all campaigns</button>
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {!loading &&
          paginated.map((campaign, index) => {
            const daysLeft = calcDaysLeft(campaign.deadline);
            const goal = parseFloat(String(campaign.funding_goal ?? "0"));
            const pledged = parseFloat(String(campaign.amount_pledged ?? "0"));
            const statusStyle = getStatusStyle(campaign.status);
            const isGoalReached = goal > 0 && pledged >= goal;
            const fundedPercent = Math.min(100, goal > 0 ? (pledged / goal) * 100 : 0);

            return (
              <div
                key={campaign.id}
                className={`flex h-full flex-col rounded-[20px] border bg-[#1e2530] p-3 shadow-sm transition-shadow duration-200 ${
                  index % 3 === 1
                    ? "border-2 border-[#a78bfa]/60 shadow-lg shadow-[#6f42c1]/15 hover:shadow-xl hover:shadow-[#6f42c1]/20"
                    : "border-white/10 hover:border-[#a78bfa]/40 hover:shadow-md"
                }`}
              >
                <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#6f42c1]/10">
                  {campaign.image_url ? (
                    <Image
                      src={campaign.image_url}
                      alt={campaign.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-semibold text-[#a78bfa]">
                      {(campaign.title || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mb-1 flex items-start justify-between gap-2">
                  <Link href={`/campaigns/${campaign.id}`} className="line-clamp-1 text-base font-medium leading-tight text-white hover:text-[#c4b5fd]">
                    {campaign.title}
                  </Link>
                  <span className={`shrink-0 rounded-full border border-white/5 px-2 py-0.5 text-[10px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>

                <p className="mb-3 line-clamp-2 min-h-10 text-xs leading-5 text-gray-400">
                  {campaign.description || "Campaign details are available on the public campaign page."}
                </p>

                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300">
                    <Users className="h-3.5 w-3.5 text-[#a78bfa]" />
                    {Number(campaign.investor_count ?? 0)} backers
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] capitalize text-gray-300">
                    {campaign.category || "Uncategorized"}
                  </span>
                </div>

                <div className="mt-auto space-y-1.5 border-t border-white/10 pt-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Raised</span>
                    <span className="font-semibold tabular-nums text-white">{pledged.toFixed(3)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Funding goal</span>
                    <span className="font-medium tabular-nums text-gray-200">{goal.toFixed(3)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Backers</span>
                    <span className="font-medium tabular-nums text-gray-200">{Number(campaign.investor_count ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-gray-400">Funding</span>
                    <span className="font-semibold tabular-nums text-white">{fundedPercent.toFixed(0)}% <span className="font-normal text-gray-400">· {daysLeft > 0 ? `${daysLeft}d left` : "Closed"}</span></span>
                  </div>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label={`${campaign.title} funding progress`}
                    aria-valuenow={Math.round(fundedPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6f42c1] to-[#a78bfa]" style={{ width: `${fundedPercent}%` }} />
                  </div>
                </div>

                {isGoalReached && campaign.contract_address && !campaign.funds_withdrawn && (
                  <button
                    onClick={() => handleWithdrawFunds(campaign)}
                    disabled={txPending === String(campaign.id)}
                    className="mt-3 self-start rounded-lg border border-[#a78bfa]/20 bg-[#6f42c1]/15 px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] transition hover:bg-[#6f42c1]/25 disabled:opacity-50"
                  >
                    {txPending === String(campaign.id) ? "Withdrawing..." : "Withdraw Funds"}
                  </button>
                )}
              </div>
            );
          })}
      </div>

          {!loading && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-[#6f42c1]/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition ${
                          currentPage === page
                            ? "bg-[#6f42c1] text-white"
                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-[#6f42c1]/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              )}
              
    </div>
  );
}
