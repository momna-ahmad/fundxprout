"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Target, Eye, Edit2, ChevronLeft, ChevronRight, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { ethers } from "ethers";
import BusinessCampaignJSON from "@/abis/BusinessCampaign.json";
import CampaignReviewInfo from "@/components/campaign-review-info";
import { logTransaction } from "@/utils/investmentUtils";
import { createClient } from "@/utils/supabase/client";
import { calcDaysLeft } from "@/components/campaign-card";

export interface CampaignItem {
  id: string | number;
  title: string;
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
    draft: { bg: "bg-amber-400/10", text: "text-amber-300", label: "Draft" },
    in_review: { bg: "bg-sky-400/10", text: "text-sky-300", label: "In Review" },
    approved: { bg: "bg-emerald-400/10", text: "text-emerald-300", label: "Approved" },
    launched: { bg: "bg-emerald-400/10", text: "text-emerald-300", label: "Launched" },
    ended: { bg: "bg-slate-400/10", text: "text-slate-300", label: "Ended" },
    successful: { bg: "bg-teal-400/10", text: "text-teal-300", label: "Successful" },
    failed: { bg: "bg-rose-400/10", text: "text-rose-300", label: "Failed" },
    rejected: { bg: "bg-rose-400/10", text: "text-rose-300", label: "Rejected" },
  };

  return (
    statusMap[status?.toLowerCase() ?? ""] || {
      bg: "bg-white/10",
      text: "text-gray-400",
      label: status || "Unknown",
    }
  );
}

function buildDraftEditHref(campaign: CampaignItem): string {
  return `/create-campaign?campaignId=${encodeURIComponent(String(campaign.id ?? ""))}`;
}

export default function DashboardOverviewTab({
  campaigns = [],
  loading = false,
}: DashboardOverviewTabProps) {
  const [txPending, setTxPending] = useState<string | null>(null);
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const ITEMS_PER_PAGE = 5;

  const statusOptions = Array.from(new Set(campaigns.map((campaign) => campaign.status?.toLowerCase()).filter(Boolean))).sort();
  const categoryOptions = Array.from(new Set(campaigns.map((campaign) => campaign.category?.trim()).filter((category): category is string => Boolean(category)))).sort((a, b) => a.localeCompare(b));
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = !search || campaign.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status?.toLowerCase() === statusFilter;
    const matchesCategory = categoryFilter === "all" || campaign.category?.toLowerCase() === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE);
  const paginated = filteredCampaigns.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  function toggleCampaign(campaignId: string | number) {
    const key = String(campaignId);
    setExpandedCampaigns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

        <Link
          href="/create-campaign"
          className="w-full sm:w-fit rounded-xl border border-[#8b6bd1]/40 bg-[#6f42c1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a3599] inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
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

      {!loading && campaigns.length > 0 && (
        <div className="mb-5 rounded-2xl border border-slate-400/40 bg-[#151c2a] p-4 shadow-sm shadow-black/20 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter campaigns
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(160px,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">Search campaigns</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
                placeholder="Search by campaign title"
                className="w-full rounded-xl border border-slate-400/35 bg-[#0f1725] py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[#c4b5fd] focus:ring-2 focus:ring-[#8b6bd1]/30"
              />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-xl border border-slate-400/35 bg-[#0f1725] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c4b5fd] focus:ring-2 focus:ring-[#8b6bd1]/30">
                <option value="all">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{getStatusStyle(status).label}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setCurrentPage(1); }} className="w-full rounded-xl border border-slate-400/35 bg-[#0f1725] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c4b5fd] focus:ring-2 focus:ring-[#8b6bd1]/30">
                <option value="all">All categories</option>
                {categoryOptions.map((category) => <option key={category} value={category.toLowerCase()}>{category}</option>)}
              </select>
            </label>
            <div className="flex items-center justify-start px-1 text-xs text-gray-500 sm:col-span-2 xl:col-span-1 xl:justify-end">
              <span className="font-medium text-slate-300">{filteredCampaigns.length} {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}</span>
            </div>
          </div>
        </div>
      )}

      {!loading && campaigns.length > 0 && filteredCampaigns.length === 0 && (
        <div className="rounded-2xl border border-slate-400/40 bg-[#151c2a] px-5 py-10 text-center">
          <p className="text-sm font-medium text-gray-300">No campaigns match these filters.</p>
          <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); setCurrentPage(1); }} className="mt-2 text-sm font-medium text-[#a78bfa] hover:text-white">Clear filters</button>
        </div>
      )}

      <div className="space-y-4">
        {!loading &&
          paginated.map((campaign) => {
            const daysLeft = calcDaysLeft(campaign.deadline);
            const goal = parseFloat(String(campaign.funding_goal ?? "0"));
            const pledged = parseFloat(String(campaign.amount_pledged ?? "0"));
            const statusStyle = getStatusStyle(campaign.status);
            const isGoalReached = pledged >= goal;
            const statusLower = campaign.status?.toLowerCase() ?? "";
            const isExpanded = expandedCampaigns.has(String(campaign.id));
            const progressPercent = Math.min(100, goal > 0 ? (pledged / goal) * 100 : 0);

            const shouldShowValuationAndEquity = ![
              "draft",
              "in_review",
              "rejected",
            ].includes(statusLower);

            const offeredPct =
              campaign.equity_offered !== undefined && campaign.equity_offered !== null
                ? parseFloat(String(campaign.equity_offered))
                : 0;

            const retainedPct =
              campaign.equity_retained !== undefined && campaign.equity_retained !== null
                ? parseFloat(String(campaign.equity_retained))
                : 100 - offeredPct;

            const metrics: Array<{
              label: string;
              value: string | number;
              accent: boolean;
            }> = [
              {
                label: "Goal",
                value: `${goal.toFixed(3)} ETH`,
                accent: false,
              },
              {
                label: "Amount Pledged",
                value: `${pledged.toFixed(3)} ETH`,
                accent: false,
              },
              {
                label: "Investors",
                value: Number(campaign.investor_count ?? 0),
                accent: false,
              },
              {
                label: "Category",
                value: campaign.category ?? "—",
                accent: false,
              },
              {
                label: "Duration Left",
                value: daysLeft > 0 ? `${daysLeft}d` : "Ended",
                accent: false,
              },
              {
                label: "Price/Token",
                value: `${parseFloat(String(campaign.price_per_token ?? "0")).toFixed(6)} ETH`,
                accent: true,
              },
            ];

            if (shouldShowValuationAndEquity) {
              const valuationVal = parseFloat(String(campaign.valuation ?? "0"));
              metrics.push(
                {
                  label: "Approved Valuation",
                  value: `${valuationVal.toFixed(3)} ETH`,
                  accent: true,
                },
                {
                  label: "Equity Offered / Retained",
                  value: `${offeredPct.toFixed(4)}% / ${retainedPct.toFixed(2)}%`,
                  accent: true,
                }
              );
            }

            return (
              <div
                key={campaign.id}
                className="overflow-hidden rounded-2xl border border-slate-400/40 bg-[#151c2a] shadow-lg shadow-black/20 transition-colors hover:border-slate-300/55"
              >
                <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`campaign-details-${campaign.id}`}
                    onClick={() => toggleCampaign(campaign.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a78bfa]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-white sm:text-sm">{campaign.title}</span>
                      <span className="mt-1 block text-xs text-slate-200">{campaign.category || "Uncategorized"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border border-white/5 px-2.5 py-1 text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {statusStyle.label}
                    </span>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180 text-gray-300" : ""}`} />
                    </span>
                  </button>
                  {["rejected", "approved", "adjusted"].includes(statusLower) && (
                    <CampaignReviewInfo review={campaign.campaign_review} />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 px-5 pt-3 sm:grid-cols-3 sm:px-6">
                  {[
                    { label: "Funding goal", value: `${goal.toFixed(3)} ETH` },
                    { label: "Raised", value: `${pledged.toFixed(3)} ETH` },
                    { label: "Investors", value: Number(campaign.investor_count ?? 0) },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0 rounded-lg border border-slate-300/15 bg-[#1c2738] px-3 py-2">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-300 sm:text-[11px]">{item.label}</p>
                      <p className="mt-1 truncate text-sm font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-4 pt-3 sm:px-6">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-200">
                    <span>Funding progress</span>
                    <span className="tabular-nums">{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div role="progressbar" aria-label={`${campaign.title} funding progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)} className="h-2 overflow-hidden rounded-full bg-slate-500/50">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {isExpanded && (
                  <div id={`campaign-details-${campaign.id}`} className="border-t border-white/[0.10] px-5 pb-4 pt-3 sm:px-6">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                      {metrics.map((item) => (
                        <div key={item.label} className="min-w-0 rounded-lg border border-slate-400/25 bg-[#202c3f] px-3 py-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-200">{item.label}</p>
                          <p className={`break-words text-xs font-semibold ${item.accent ? "text-[#c4b5fd]" : "text-gray-200"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.07] pt-4">
                  {isGoalReached && campaign.contract_address && !campaign.funds_withdrawn && (
                    <button
                      onClick={() => handleWithdrawFunds(campaign)}
                      disabled={txPending === campaign.contract_address}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                    >
                      {txPending === campaign.contract_address
                        ? "Withdrawing..."
                        : "Withdraw Funds"}
                    </button>
                  )}

                  {["draft", "approved", "adjusted"].includes(statusLower) && (
                    <Link
                      href={buildDraftEditHref(campaign)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 transition-colors hover:text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      {["approved", "adjusted"].includes(statusLower)
                        ? "Launch"
                        : "Edit"}
                    </Link>
                  )}

                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c4b5fd] transition-colors hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Public Page
                  </Link>

                  {campaign.transaction_hash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${campaign.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-white"
                    >
                      View on Etherscan
                    </a>
                  )}
                </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
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
    </div>
  );
}
