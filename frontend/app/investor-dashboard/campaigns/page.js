"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { getAllCampaigns } from "@/utils/supabase/getCampaigns";
import { fetchInvestmentHistory as fetchHistoryUtil, logTransaction , recordClaimedToken} from "@/utils/investmentUtils";
import { Target, Users, Clock, DollarSign, ExternalLink, TrendingUp , Filter } from "lucide-react";
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

  async function handleClaimTokens(campaignContractAddress, tokenContractAddress, tokenSymbol, investmentId, campaignId) {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    setClaimPending(campaignContractAddress);
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
      alert("No escrowed tokens available to claim for this address.");
      setClaimPending(null);
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
        investmentId: investmentId,
        userId: user.id,
        amount: claimedAmount,
        tokenSymbol: tokenSymbol,
      });

      // Also log to transactions table if needed
      await logTransaction({
        userId: user.id,
        campaignId: campaignId,
        referenceId: investmentId,
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
        // Keep latest investment id for logging references
        existing.latestInvestmentId = inv.id;
      } else {
        map.set(campaign.id, {
          campaign,
          userTotalInvested: invAmount,
          transactions: inv.transaction_hash ? [inv.transaction_hash] : [],
          latestInvestmentId: inv.id,
          created_at: inv.created_at || campaign.created_at,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">Loading your campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-foreground">
                {totalInvested.toFixed(4)} ETH
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-ring opacity-60" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Campaigns Invested</p>
              <p className="text-2xl font-bold text-foreground">{filteredCampaigns.length}</p>
            </div>
            <Target className="w-8 h-8 text-ring opacity-60" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Campaigns</p>
              <p className="text-2xl font-bold text-foreground">{activeCampaigns}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-ring opacity-60" />
          </div>
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Filter className="w-4 h-4 text-ring" /> Filter Investments
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Campaigns" },
            { id: "ongoing", label: "Ongoing" },
            { id: "ended", label: "Ended" },
            { id: "recent", label: "Most Recent" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === tab.id
                  ? "bg-ring text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign cards */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Target className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No investments yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Campaigns you invest in will appear here for tracking.
          </p>
          <Link
            href="/homepage"
            className="inline-block px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--ring)" }}
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

            return (
              <div
                key={inv.id || idx}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-ring/40 transition-colors"
              >
                {/* Campaign image */}
                <div className="h-32 relative" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ring) 30%, transparent), color-mix(in srgb, var(--chart-5) 30%, transparent))" }}>
                  {campaign.image_url && (
                    <img
                      src={campaign.image_url}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <RiskBadge score={campaign.risk_score} />
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {isActive ? "Active" : "Ended"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Title + category */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {campaign.title}
                    </h3>
                    {campaign.category && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 border font-semibold"
                        style={{
                          background: "color-mix(in srgb, var(--ring) 15%, transparent)",
                          borderColor: "color-mix(in srgb, var(--ring) 28%, transparent)",
                          color: "var(--ring)",
                        }}
                      >
                        {campaign.category}
                      </span>
                    )}
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {campaign.description}
                    </p>
                  )}

                  {/* Funding progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>
                        {raised.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH raised
                      </span>
                      <span>
                        {progress.toFixed(0)}% of {goal.toLocaleString()} ETH
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: "var(--ring)" }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users size={12} className="text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Total Investors
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {Number(campaign.investor_count ?? 0)}
                      </p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target size={12} className="text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Goal Remaining
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {remaining.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH
                      </p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={12} className="text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          You Invested
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {parseFloat(inv.userTotalInvested).toFixed(4)} ETH
                      </p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={12} className="text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Days Left
                        </span>
                      </div>
                      <p
                        className={`text-sm font-bold ${
                          daysLeft > 0 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {daysLeft > 0 ? daysLeft : "Ended"}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-3">
                    {isGoalReached && (
                      <button
                        onClick={() =>
                          handleClaimTokens(
                            campaign.contract_address,
                            campaign.token_contract_address,
                            campaign.token_symbol || "EQT",
                            inv.id,
                            campaign.id
                          )
                        }
                        disabled={claimPending === campaign.contract_address}
                        className="w-full mb-3 py-2 px-4 rounded-lg text-xs font-bold text-white transition duration-200 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
                      >
                        {claimPending === campaign.contract_address ? "Claiming Tokens..." : "Claim Equity Tokens"}
                      </button>
                    )}
                  </div>

                  {!isGoalReached && (
                      <button
                        onClick={() => handleRefund(campaign.contract_address,campaign.id, inv.id)}
                        disabled={refundPending === campaign.contract_address}
                        className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white transition duration-200 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50"
                      >
                        
                        {refundPending === campaign.contract_address ? "Processing Refund..." : "Withdraw Invested Funds"}
                      </button>
                    )}

                  {/* Transaction footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-3">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-[11px] font-semibold transition-colors hover:underline"
                        style={{ color: "var(--ring)" }}
                      >
                        View Campaign
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
