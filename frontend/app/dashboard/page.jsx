//frontend/app/dashboard/page.js
"use client";
// shafqaat — business dashboard Dashboard: fully dynamic, reads real data from Supabase
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Plus,
  Eye,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getMyCampaigns } from "@/utils/supabase/getCampaigns";
import { getMyProfile, calcProfileCompletion } from "@/utils/supabase/getProfile";
import Navbar from "@/components/navbar";
import { ethers } from "ethers";
import BusinessCampaignJSON from "@/abis/BusinessCampaign.json";
import DashboardOverviewTab from "@/components/Owner/DashboardOverviewTab";
import ProfileSettings from "@/components/Owner/ProfileSettings";
import OwnerCampaignAnalytics from "@/components/owner-campaign-analytics";

const ITEMS_PER_PAGE = 10;

// Function to invoke withdrawFunds on the specific campaign contract
async function handleWithdrawFunds(contractAddress, setTxPending) {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    setTxPending(contractAddress); // Set loading state for this specific card
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Attach to the specific campaign contract address fetched from Supabase
    const campaignContract = new ethers.Contract(
      contractAddress,
      BusinessCampaignJSON.abi,
      signer
    );

    // Trigger the withdrawFunds() method on BusinessCampaign.sol
    const tx = await campaignContract.withdrawFunds();
    alert("Withdrawal transaction submitted! Hash: " + tx.hash);

    await tx.wait();
    alert("Funds successfully withdrawn to your wallet!");
    window.location.reload(); // Refresh UI to update balances
  } catch (err) {
    console.error("Withdrawal error:", err);
    alert(err.reason || err.message || "Withdrawal failed");
  } finally {
    setTxPending(null);
  }
}

function calcDaysLeft(deadlineTimestamp) {
  if (!deadlineTimestamp) return 0;

  const deadline = new Date(deadlineTimestamp);
  const now = new Date();

  // If already expired
  if (deadline <= now) return 0;

  // Calculate remaining days (ceil rounds up partial days)
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// shafqaat — Get status styling based on campaign status
function getStatusStyle(status) {
  const statusMap = {
    draft: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Draft" },
    in_review: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "In Review" },
    approved: { bg: "bg-amber-500/15", text: "text-amber-300", label: "Approved" },
    adjusted: { bg: "bg-amber-500/15", text: "text-amber-300", label: "Adjusted" },
    launched: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Launched" },
    successful: { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "Successful" },
    failed: { bg: "bg-red-500/15", text: "text-red-300", label: "Failed" },
    ended: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Ended" },
    rejected: { bg: "bg-[#6f42c1]/15", text: "text-[#c4b5fd]", label: "Rejected" },
  };
  return statusMap[status?.toLowerCase()] || { bg: "bg-white/10", text: "text-gray-400", label: status || "Unknown" };
}

function buildDraftEditHref(campaign) {
  return `/create-campaign?campaignId=${encodeURIComponent(String(campaign.id ?? ""))}`;
}

export default function DashboardPage() {
  // shafqaat — Active tab state
  const [activeTab, setActiveTab] = useState("overview");
  const [tabSwitchLoading, setTabSwitchLoading] = useState(false);
  const tabSwitchTimeout = useRef(null);

  const switchDashboardTab = (tabId) => {
    if (activeTab === tabId) return;
    setActiveTab(tabId);
    setTabSwitchLoading(true);
    if (tabSwitchTimeout.current) clearTimeout(tabSwitchTimeout.current);
    tabSwitchTimeout.current = setTimeout(() => setTabSwitchLoading(false), 300);

    const url = new URL(window.location.href);
    if (tabId === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tabId);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => () => {
    if (tabSwitchTimeout.current) clearTimeout(tabSwitchTimeout.current);
  }, []);

  // shafqaat — Real data from Supabase
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // My Campaigns tab status filter and pagination state
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [txPending, setTxPending] = useState(null);

  // shafqaat — Fetch user, campaigns and profile in parallel on mount
  useEffect(() => {
    async function loadAll() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      const [camps, prof] = await Promise.all([
        getMyCampaigns(),
        getMyProfile(),
      ]);
      setCampaigns(camps);
      setProfile(prof);
      setLoading(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const validTabs = ["overview", "campaign-overview", "campaigns", "profile", "financial-documents"];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requestedTab === "analytics") setActiveTab("overview");
    else if (validTabs.includes(requestedTab)) setActiveTab(requestedTab);
  }, []);

  // shafqaat — Compute real stats from the fetched campaigns
  const stats = {
    totalReceived: campaigns.reduce(
      (s, c) => s + parseFloat(c.amount_pledged ?? "0"),
      0,
    ),
    activeCampaigns: campaigns.filter(
      (c) => c.status?.toLowerCase() === "launched",
    ).length,
    totalCampaigns: campaigns.length,
    profileCompletion: calcProfileCompletion(profile),
  };

  const financialUploadCampaigns = campaigns.filter(
    (campaign) => campaign.status?.toLowerCase() === "successful",
  );

  // Filtered + paginated campaigns for My Campaigns tab
  const campaignStatusOptions = [...new Set(campaigns.map((campaign) => campaign.status?.toLowerCase()).filter(Boolean))].sort();
  const filtered = campaigns.filter(
    (campaign) => campaignStatusFilter === "all" || campaign.status?.toLowerCase() === campaignStatusFilter,
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "campaign-overview", label: "Campaign Overview", icon: TrendingUp },
    { id: "campaigns", label: "My Campaigns", icon: Target },
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "financial-documents", label: "Financial Documents", icon: FileText },
  ];

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Creator";

  return (
    <div className="min-h-screen bg-[#181A2A] ">
      <Navbar />
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-7">
        {/* shafqaat — Dashboard header with real user name */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              {loading ? "Dashboard" : `Welcome, ${displayName}`}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Manage your campaigns and track your progress
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-[#1a2030] border border-white/5 rounded-xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#6f42c1]" />
                <span className="text-white text-sm font-medium">
                  Business Owner
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-6">

        </div>

      {/* shafqaat — Tabs + Content */}
      <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
        {/* Tab Nav */}
        <div className="border-b border-white/10 px-6">
          <nav className="flex gap-1 pt-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    switchDashboardTab(tab.id);
                  }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[#6f42c1] text-[#a78bfa] bg-[#6f42c1]/10"
                      : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {/* shafqaat — Profile tab shows incomplete badge */}
                  {tab.id === "profile" && stats.profileCompletion < 100 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-[#a78bfa] inline-block" />
                  )}
                  {tab.id === "financial-documents" && financialUploadCampaigns.length > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6f42c1] px-1.5 text-[10px] font-bold text-white">
                      {financialUploadCampaigns.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-8">
          <div className="relative min-h-[320px]">
          {/* ── Overview Tab ─────────────────────────────────── */}
          {activeTab === "overview" && (
            <OwnerCampaignAnalytics campaigns={campaigns} loading={loading} />
          )}

          {activeTab === "campaign-overview" && (
            <DashboardOverviewTab campaigns={campaigns} loading={loading} />
          )}

          {activeTab === "financial-documents" && (
            <section aria-labelledby="financial-documents-title" className="mx-auto max-w-4xl">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#6f42c1]/15 text-[#c4b5fd]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="financial-documents-title" className="text-xl font-bold text-white">Financial Documents</h2>
                    {!loading && financialUploadCampaigns.length > 0 && (
                      <span className="rounded-full border border-[#a78bfa]/20 bg-[#6f42c1]/15 px-2.5 py-1 text-xs font-semibold text-[#c4b5fd]">
                        {financialUploadCampaigns.length} {financialUploadCampaigns.length === 1 ? "upload needed" : "uploads needed"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">Upload and manage financial documents for your successful campaigns.</p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/5 bg-[#1e2530] p-6 text-sm text-gray-400">Loading campaigns…</div>
              ) : financialUploadCampaigns.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-[#1e2530] px-6 py-12 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-gray-500" />
                  <p className="font-semibold text-white">No financial uploads needed</p>
                  <p className="mt-1 text-sm text-gray-400">Successful campaigns that need financial documents will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {financialUploadCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#1e2530] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#a78bfa]" />
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-white">{campaign.title || "Untitled campaign"}</p>
                          <p className="mt-1 text-sm text-gray-400">Financial documents are needed for this successful campaign.</p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/financials?campaignId=${encodeURIComponent(String(campaign.id))}`}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6f42c1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a3599] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
                      >
                        <Upload className="h-4 w-4" />
                        Upload documents
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── My Campaigns Tab ── */}
          {activeTab === "campaigns" && (
            <div>
              {/* Header + status filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-white">
                  My Campaigns {!loading && `(${campaigns.length})`}
                </h2>
                <label className="sm:ml-auto">
                  <span className="sr-only">Filter campaigns by status</span>
                  <select
                    value={campaignStatusFilter}
                    onChange={(event) => {
                      setCampaignStatusFilter(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-44 rounded-xl border border-white/10 bg-[#1e2530] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#a78bfa] focus:ring-2 focus:ring-[#6f42c1]/30"
                  >
                    <option value="all">All statuses</option>
                    {campaignStatusOptions.map((status) => (
                      <option key={status} value={status}>{getStatusStyle(status).label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* shafqaat — Loading / empty states */}
              {loading && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Loading…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {campaigns.length === 0 ? "No campaigns yet." : "No campaigns with this status."}
                </div>
              )}

              {/* shafqaat — Campaign table */}
              {!loading && paginated.length > 0 && (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {[
                          "Campaign",
                          "Goal (ETH)",
                          "Pledged (ETH)",
                          "Investors",
                          "Category",
                          "Days Left",
                          "Status",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((campaign) => {
                        const daysLeft = calcDaysLeft(campaign.deadline);
                        const statusStyle = getStatusStyle(campaign.status);
                        return (
                          <tr
                            key={campaign.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-4 px-4 font-medium text-white max-w-50 truncate">
                              {campaign.title}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {parseFloat(campaign.funding_goal ?? "0").toFixed(
                                3,
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {parseFloat(campaign.amount_pledged ?? "0").toFixed(
                                3,
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {Number(campaign.investor_count ?? 0)}
                            </td>
                            <td className="py-4 px-4 text-gray-300 capitalize">
                              {campaign.category ?? "—"}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {daysLeft > 0 ? `${daysLeft}d` : "Ended"}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    statusStyle.bg
                                  } ${statusStyle.text}`}
                                >
                                  {statusStyle.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                {campaign.status?.toLowerCase() === "draft" && (
                                  <Link
                                    href={buildDraftEditHref(campaign)}
                                    className="inline-flex min-w-14 items-center justify-center rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-[#a78bfa] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
                                  >
                                    Edit
                                  </Link>
                                )}
                                {["approved", "adjusted"].includes(campaign.status?.toLowerCase()) && (
                                  <Link
                                    href={buildDraftEditHref(campaign)}
                                    className="inline-flex min-w-14 items-center justify-center rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-[#a78bfa] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
                                  >
                                    Launch
                                  </Link>
                                )}
                                <Link
                                  href={`/campaigns/${campaign.id}`}
                                  className="inline-flex min-w-14 items-center justify-center rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-[#a78bfa] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
                                >
                                  View
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* shafqaat — Pagination controls */}
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
          )}

          {activeTab === "profile" && (
            <ProfileSettings
              embedded
              onBack={() => switchDashboardTab("overview")}
            />
          )}

            {tabSwitchLoading && (
              <div role="status" aria-live="polite" className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-[#1a2030]/90 backdrop-blur-sm">
                <span className="sr-only">Loading dashboard tab</span>
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-[#a78bfa]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
