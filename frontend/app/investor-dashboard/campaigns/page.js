"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getAllCampaigns } from "@/utils/supabase/getCampaigns";
import { fetchInvestmentHistory as fetchHistoryUtil } from "@/utils/investmentUtils";
import { Target, Users, Clock, DollarSign, ExternalLink, TrendingUp } from "lucide-react";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";

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
              <p className="text-2xl font-bold text-foreground">{investedCampaigns.length}</p>
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

      {/* Campaign cards */}
      {investedCampaigns.length === 0 ? (
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
          {investedCampaigns.map(({ campaign, ...inv }, idx) => {
            const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration);
            const goal = parseFloat(campaign.funding_goal ?? 0);
            const raised = parseFloat(
              campaign.amount_pledged ?? campaign.amount_raised ?? 0
            );
            const remaining = Math.max(0, goal - raised);
            const progress = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
            const isActive = daysLeft > 0;

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
                        {parseFloat(inv.amount).toFixed(4)} ETH
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

                  {/* Transaction footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Transaction</p>
                      <p className="text-[11px] font-mono text-ring truncate">
                        {inv.transaction_hash
                          ? `${inv.transaction_hash.slice(0, 10)}...${inv.transaction_hash.slice(-8)}`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {inv.transaction_hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${inv.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-ring transition-colors"
                        >
                          <ExternalLink size={11} />
                          Etherscan
                        </a>
                      )}
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
