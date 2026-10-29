"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { getAllCampaigns } from "@/utils/supabase/getCampaigns";
import { fetchInvestmentHistory as fetchHistoryUtil, logTransaction , recordClaimedToken} from "@/utils/investmentUtils";
import { Target, DollarSign, TrendingUp, CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { ethers } from "ethers";
import BusinessCampaignJSON from "@/abis/BusinessCampaign.json";

function calcDaysLeft(createdAt, durationDays) {
  const deadline = new Date(
    new Date(createdAt).getTime() + (durationDays ?? 30) * 24 * 60 * 60 * 1000
  );
  const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function InvestorCampaignsPage() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [investmentHistory, setInvestmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimPending, setClaimPending] = useState(null);
  const [refundPending, setRefundPending] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");

  async function handleClaimTokens(campaignContractAddress, tokenContractAddress, tokenSymbol, investmentIds, campaignId) {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    setClaimPending(campaignContractAddress);
    console.log("Claiming for investment IDs:", investmentIds);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const campaignContract = new ethers.Contract(
      campaignContractAddress,
      BusinessCampaignJSON.abi,
      signer
    );

    const tokensOwedWei = await campaignContract.tokenEscrowBalances(signer.getAddress());

    if (BigInt(tokensOwedWei) === BigInt(0)) {
      // Auto-sync database in case on-chain claim already succeeded earlier
      if (user?.id) {
        const campaignObj = campaigns.find(c => c.id === campaignId);
        const pptEth = parseFloat(campaignObj?.price_per_token || "0.001") || 0.001;
        const invObj = investmentHistory.find(i => i.campaign_id === campaignId);
        const invAmt = parseFloat(invObj?.amount || "0") || 0;
        const derivedTokens = pptEth > 0 ? invAmt / pptEth : 0;

        await recordClaimedToken({
          campaignId: campaignId,
          investmentIds: investmentIds,
          userId: user.id,
          amount: Math.round(derivedTokens) || 1,
          tokenSymbol: tokenSymbol,
        });
      }
      alert("Tokens have already been claimed on-chain for this wallet. Dashboard updated!");
      window.location.reload();
      return;
    }

    const claimedAmount = parseFloat(ethers.formatUnits(tokensOwedWei, 18));

    // 1. Call claimTokens on the campaign smart contract
    console.log("Claiming tokens from contract:", campaignContractAddress);
    const tx = await campaignContract.claimTokens();
    alert(`Claim transaction submitted! Hash: ${tx.hash}`);

    await tx.wait();

    if (user?.id) {
      await recordClaimedToken({
        campaignId: campaignId,
        investmentIds: investmentIds,
        userId: user.id,
        amount: claimedAmount,
        tokenSymbol: tokenSymbol,
      });

      // Also log to transactions table
      await logTransaction({
        userId: user.id,
        campaignId: campaignId,
        referenceId: Array.isArray(investmentIds) ? investmentIds[0] : investmentIds,
        type: "token_claim",
        txHash: tx.hash,
        quantity: claimedAmount,
        token: tokenSymbol,
      });
    }

    alert("Tokens successfully claimed!");

    // 2. Prompt MetaMask to register/display the new ERC-20 token
    if (tokenContractAddress && tokenSymbol) {
      try {
        await window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: tokenContractAddress,
              symbol: tokenSymbol,
              decimals: 18,
            },
          },
        });
      } catch (watchErr) {
        console.warn("Could not automatically register token in MetaMask:", watchErr);
      }
    }

    window.location.reload();
  } catch (err) {
    console.error("Error claiming tokens:", err);
    alert(err.reason || err.message || "Failed to claim tokens. Make sure campaign is Funded and deadline has passed.");
  } finally {
    setClaimPending(null);
  }
}

// 2. Request ETH Refund (Failure Path)
  async function handleRefund(campaignContractAddress, campaignId, investmentId) {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      setRefundPending(campaignContractAddress);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const campaignContract = new ethers.Contract(
        campaignContractAddress,
        BusinessCampaignJSON.abi,
        signer
      );

      const startupStruct = await campaignContract.startup();
      const currentState = startupStruct.state;

      // ONLY call finalize if the contract is still in Active (0) state!
      if (Number(currentState) === 0) {
        console.log("Campaign is active. Calling finalize()...");
        const finalizeTx = await campaignContract.finalize();
        await finalizeTx.wait();
      }

      const userContribution = await campaignContract.contributions(signer.getAddress());

    if (BigInt(userContribution) === BigInt(0)) {
      alert("Contribution has already been refunded.");
      setRefundPending(null);
      return;
    }

      console.log("Requesting refund from contract:", campaignContractAddress);
      const tx = await campaignContract.refund();
      alert(`Refund transaction submitted! Hash: ${tx.hash}`);

      await tx.wait();
      alert("Refund successful! Funds have been returned to your wallet.");

      if (user?.id) {
      await logTransaction({
        userId: user.id,
        campaignId: campaignId,
        investmentId: investmentId,
        type: "refund",
        txHash: tx.hash,
      });
    }

      window.location.reload();
    } catch (err) {
    console.error("Error requesting refund:", err);

    // Directly match the specific revert reason or error message
    const reason = err?.reason || err?.message || "";

    if (reason.includes("No contribution recorded for this address")) {
      alert("No contribution recorded for this address.");
    } else {
      alert(reason || "Failed to process refund.");
    }
  } finally {
      setRefundPending(null);
    }
  }

  // Aggregate duplicate investments into single campaign cards
  const aggregatedCampaigns = useMemo(() => {
    const map = new Map();

    for (const inv of investmentHistory) {
      const campaign = campaigns.find((c) => c.id === inv.campaign_id);
      console.log("Processing investment:", inv, "Campaign found:", campaign);
      if (!campaign) continue;

      const existing = map.get(campaign.id);
      const invAmount = parseFloat(inv.amount || 0);

      if (existing) {
        existing.userTotalInvested += invAmount;
        if (inv.transaction_hash && !existing.transactions.includes(inv.transaction_hash)) {
          existing.transactions.push(inv.transaction_hash);
        }

      // Track investment ID if not already present
      if (inv.id && !existing.investmentIds.includes(inv.id)) {
        existing.investmentIds.push(inv.id);
      }

      } else {
        map.set(campaign.id, {
        campaign,
        userTotalInvested: invAmount,
        investmentIds: inv.id ? [inv.id] : [],
        transactions: inv.transaction_hash ? [inv.transaction_hash] : [],
        status: inv.status,
        latest_created_at: inv.created_at || campaign.created_at,
      });
      }
    }

    return Array.from(map.values());
  }, [investmentHistory, campaigns]);

  // Apply active filter (all, ongoing, ended, recent)
  const filteredCampaigns = useMemo(() => {
    let list = [...aggregatedCampaigns];

    if (activeFilter === "ongoing") {
      list = list.filter(({ campaign }) => calcDaysLeft(campaign.created_at, campaign.duration) > 0);
    } else if (activeFilter === "ended") {
      list = list.filter(({ campaign }) => calcDaysLeft(campaign.created_at, campaign.duration) === 0);
    } else if (activeFilter === "recent") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [aggregatedCampaigns, activeFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);

      const [camps, history] = await Promise.all([
        getAllCampaigns(),
        authUser ? fetchHistoryUtil(authUser.id) : Promise.resolve([]),
      ]);

      setCampaigns(camps || []);
      setInvestmentHistory(history || []);

      setLoading(false);
    }
    load();
  }, []);

  const investedCampaigns = investmentHistory
    .map((inv) => ({ ...inv, campaign: campaigns.find((c) => c.id === inv.campaign_id) }))
    .filter((item) => item.campaign);

  const totalInvested = investmentHistory.reduce(
    (s, i) => s + parseFloat(i.amount || 0),
    0
  );
  const activeCampaigns = investedCampaigns.filter(
    ({ campaign }) => calcDaysLeft(campaign.created_at, campaign.duration) > 0
  ).length;

  const filterTabs = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "ended", label: "Ended" },
    { id: "recent", label: "Most recent" },
  ];

  // Display-only counts for the tabs
  const tabCounts = {
    all: aggregatedCampaigns.length,
    ongoing: aggregatedCampaigns.filter(({ campaign }) => calcDaysLeft(campaign.created_at, campaign.duration) > 0).length,
    ended: aggregatedCampaigns.filter(({ campaign }) => calcDaysLeft(campaign.created_at, campaign.duration) === 0).length,
  };

  /* ---------------------------- Loading ---------------------------- */
  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="h-11 border-b border-border" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0">
              <div className="h-12 w-12 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading your campaigns...</span>
      </div>
    );
  }

  const rowGrid = "lg:grid-cols-[minmax(0,2.4fr)_1fr_1.5fr_0.9fr_210px]";

  return (
    <div className="space-y-6">
      {/* ------------------------------ Header ------------------------------ */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Your investments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track funding progress and claim tokens for every campaign you&apos;ve backed.
        </p>
      </div>

      {/* ------------------------ Portfolio summary ------------------------ */}
      <section
        aria-label="Portfolio summary"
        className="grid overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-border"
      >
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <DollarSign size={14} className="text-ring" />
            Total invested
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {totalInvested.toFixed(4)}
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">ETH</span>
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Target size={14} className="text-ring" />
            Campaigns backed
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {filteredCampaigns.length}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp size={14} className="text-ring" />
            Still active
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {activeCampaigns}
          </p>
        </div>
      </section>

      {/* ------------------------- Investments table ------------------------- */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Toolbar: filter tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 sm:px-5">
          <div role="tablist" aria-label="Filter investments" className="flex gap-5 overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeFilter === tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeFilter === tab.id
                    ? "border-ring text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tabCounts[tab.id] !== undefined && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {tabCounts[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-start gap-4 px-5 py-10 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Target className="h-5 w-5 text-ring" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                {activeFilter === "all" ? "No investments yet" : "No campaigns match this filter"}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeFilter === "all"
                  ? "Campaigns you invest in will show up here so you can track them."
                  : "Try another filter to see the rest of your portfolio."}
              </p>
            </div>
            {activeFilter === "all" && (
              <Link
                href="/homepage"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ring)" }}
              >
                Browse campaigns <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Column headers (desktop) */}
            <div className={`hidden border-b border-border bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid lg:gap-x-4 ${rowGrid}`}>
              <span>Campaign</span>
              <span>Your investment</span>
              <span>Funding</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            <ul className="divide-y divide-border">
              {filteredCampaigns.map(({ campaign, ...inv }, idx) => {
                const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration);
                const goal = parseFloat(campaign.funding_goal ?? 0);
                const raised = parseFloat(
                  campaign.amount_pledged ?? campaign.amount_raised ?? 0
                );
                const remaining = Math.max(0, goal - raised);
                const progress = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
                const isActive = daysLeft > 0;
                const isGoalReached = raised >= goal && goal > 0;

                const showClaimed = inv.status === "claimed";
                const showClaim = !showClaimed && (inv.status === "completed" || inv.status === "ongoing") && isGoalReached;
                const showRefund = !isGoalReached;

                const detailHref = `/investor-dashboard/campaignDetail/${campaign.id}`;

                return (
                  <li
                    key={inv.id || idx}
                    className={`grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 transition-colors hover:bg-muted/20 sm:px-5 lg:items-center lg:gap-y-0 ${rowGrid}`}
                  >
                    {/* Campaign */}
                    <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                      <div
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border"
                        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ring) 30%, transparent), color-mix(in srgb, var(--chart-5) 30%, transparent))" }}
                      >
                        {campaign.image_url && (
                          <img
                            src={campaign.image_url}
                            alt={campaign.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={detailHref}
                          className="block truncate text-sm font-semibold text-foreground hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                          {campaign.category && <span className="truncate">{campaign.category}</span>}
                          <span className="tabular-nums">
                            {Number(campaign.investor_count ?? 0)} investors
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Your investment */}
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground lg:hidden">Your investment</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {parseFloat(inv.userTotalInvested).toFixed(4)} ETH
                      </p>
                    </div>

                    {/* Status (mobile: sits beside investment) */}
                    <div className="lg:order-4">
                      <p className="mb-1 text-xs text-muted-foreground lg:hidden">Status</p>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          isActive
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
                        {isActive ? "Active" : "Ended"}
                      </span>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : "Funding closed"}
                      </p>
                    </div>

                    {/* Funding */}
                    <div className="col-span-2 lg:order-3 lg:col-span-1">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium tabular-nums text-foreground">
                          {raised.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          of {goal.toLocaleString()} ETH
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, background: "var(--ring)" }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
                        <span>{progress.toFixed(0)}% funded</span>
                        <span>{remaining.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH left</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex flex-wrap items-center gap-2 lg:order-5 lg:col-span-1 lg:justify-end">
                      {showClaimed && (
                        <button
                          disabled
                          className="inline-flex h-8 flex-1 cursor-default items-center justify-center gap-1.5 rounded-md border border-green-500/20 bg-green-500/10 px-3 text-xs font-semibold text-green-400 lg:flex-none"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Claimed
                        </button>
                      )}

                      {showClaim && (
                        <button
                          onClick={() =>
                            handleClaimTokens(
                              campaign.contract_address,
                              campaign.token_contract_address,
                              campaign.token_symbol || "EQT",
                              inv.investmentIds,
                              campaign.id
                            )
                          }
                          disabled={claimPending === campaign.contract_address}
                          title="Claim equity tokens"
                          className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-purple-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 lg:flex-none"
                        >
                          {claimPending === campaign.contract_address ? "Claiming..." : "Claim tokens"}
                        </button>
                      )}

                      {showRefund && (
                        <button
                          onClick={() => handleRefund(campaign.contract_address, campaign.id, inv.id)}
                          disabled={refundPending === campaign.contract_address}
                          title="Withdraw invested funds"
                          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-red-500/40 px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50 lg:flex-none"
                        >
                          {refundPending === campaign.contract_address ? "Processing..." : "Withdraw"}
                        </button>
                      )}

                      <Link
                        href={detailHref}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted lg:flex-none"
                      >
                        View <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}