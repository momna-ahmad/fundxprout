import { createClient } from "@/utils/supabase/server";
import {
  CheckCircle, XCircle, Clock, BarChart2, ShieldAlert,
  TrendingUp, FileText, Building2, ExternalLink, Sparkles, RefreshCw,
} from "lucide-react";
import { adminApproveCampaign, adminRejectCampaign, adminToggleSecondaryTrading, adminTriggerRiskAnalysis } from "@/lib/action";
import Link from "next/link";

function RiskBadge({ score }) {
  if (score === null || score === undefined)
    return <span className="text-xs text-yellow-400 italic font-semibold">Analysis Pending</span>;
  const label = score >= 75 ? "High Risk" : score >= 50 ? "Medium" : "Low Risk";
  const color = score >= 75 ? "#f87171" : score >= 50 ? "#fbbf24" : "#4ade80";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {score}/100 · {label}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label: "Pending Review", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    approved:  { label: "Approved",       color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    launched:  { label: "Live / Launched",color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
    rejected:  { label: "Rejected",       color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    draft:     { label: "Draft",          color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
    active:    { label: "Active",         color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  };
  const style = map[status] ?? { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.08)" };
  return (
    <span
      className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-bold"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  );
}

export default async function AdminCampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(`
      id, title, description, status, created_at,
      funding_goal, target_amount, risk_score, category, secondary_trading_enabled,
      profiles:owner ( full_name, user_id )
    `)
    .order("created_at", { ascending: false });

  const pending   = campaigns?.filter((c) => c.status === "pending")  ?? [];
  const approved  = campaigns?.filter((c) => ["approved", "launched", "active"].includes(c.status)) ?? [];
  const rejected  = campaigns?.filter((c) => c.status === "rejected") ?? [];
  const all       = campaigns ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
            <BarChart2 className="text-[#a78bfa] h-8 w-8" />
            Campaign Oversight &amp; Moderation
          </h1>
          <p className="text-gray-400 text-sm">Review, approve, run AI risk scoring, and toggle secondary trading for campaigns.</p>
        </div>
        <Link
          href="/admin-dashboard"
          className="text-sm text-[#a78bfa] hover:underline flex items-center gap-1"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: all.length,      icon: FileText,    color: "#94a3b8" },
          { label: "Pending",  value: pending.length,  icon: Clock,       color: "#fbbf24" },
          { label: "Approved/Live", value: approved.length, icon: CheckCircle, color: "#4ade80" },
          { label: "Rejected", value: rejected.length, icon: XCircle,     color: "#f87171" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a2030] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0" style={{ color }} />
            <div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending (most important first) */}
      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-400" />
            Pending Review ({pending.length})
          </h2>
          <div className="flex flex-col gap-4">
            {pending.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* All other campaigns */}
      {all.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#a78bfa]" />
            All Platform Campaigns ({all.length})
          </h2>
          <div className="flex flex-col gap-4">
            {all.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} compact={campaign.status !== 'pending'} />
            ))}
          </div>
        </section>
      )}

      {all.length === 0 && (
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 p-12 text-center text-gray-500">
          No campaigns found.
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, compact = false }) {
  const isPending = campaign.status === "pending";

  return (
    <div
      className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden transition"
      style={isPending ? { borderColor: "rgba(251,191,36,0.3)", boxShadow: "0 0 24px rgba(251,191,36,0.06)" } : {}}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-white">{campaign.title || "Untitled Campaign"}</h3>
              <StatusBadge status={campaign.status} />
              {campaign.secondary_trading_enabled && (
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                  Secondary Trading Active
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{campaign.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-gray-400" />
                {campaign.profiles?.full_name || "Startup Founder"}
              </span>
              {campaign.category && (
                <span className="rounded-lg bg-white/5 px-2 py-0.5 text-gray-300">{campaign.category}</span>
              )}
              {(campaign.funding_goal || campaign.target_amount) && (
                <span>Goal: <strong className="text-gray-300">ETH {Number(campaign.funding_goal || campaign.target_amount).toLocaleString()}</strong></span>
              )}
              <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <RiskBadge score={campaign.risk_score} />
            </div>
          </div>

          {/* Doc links */}
          <div className="flex flex-col gap-2 flex-shrink-0 text-xs">
            <Link
              href={`/campaigns/${campaign.id}`}
              target="_blank"
              className="text-[#a78bfa] hover:underline flex items-center gap-1 font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Campaign Details
            </Link>
          </div>
        </div>

        {/* Admin Control Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3 pt-5 border-t border-white/5">
          {/* AI Risk Score Trigger */}
          <form
            action={async () => {
              "use server";
              await adminTriggerRiskAnalysis(campaign.id);
            }}
          >
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              {campaign.risk_score !== null ? 'Re-run AI Risk Analysis' : 'Run AI Risk Analysis'}
            </button>
          </form>

          {/* Secondary Trading Toggle */}
          <form
            action={async () => {
              "use server";
              await adminToggleSecondaryTrading(campaign.id, !campaign.secondary_trading_enabled);
            }}
          >
            <button
              type="submit"
              className={`px-3.5 py-1.5 border rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                campaign.secondary_trading_enabled
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {campaign.secondary_trading_enabled ? 'Disable Secondary Trading' : 'Enable Secondary Trading'}
            </button>
          </form>

          {/* Approve / Reject buttons for pending */}
          {isPending && (
            <>
              <form
                action={async () => {
                  "use server";
                  await adminApproveCampaign(campaign.id);
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </button>
              </form>

              <form
                action={async () => {
                  "use server";
                  await adminRejectCampaign(campaign.id, "Admin review rejected");
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
