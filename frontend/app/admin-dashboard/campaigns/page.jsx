import { createClient } from "@/utils/supabase/server";
import {
  CheckCircle, XCircle, Clock, BarChart2, ShieldAlert,
  TrendingUp, FileText, Building2, ExternalLink,
} from "lucide-react";
import { adminApproveCampaign, adminRejectCampaign } from "@/lib/action";
import Link from "next/link";

function RiskBadge({ score }) {
  if (score === null)
    return <span className="text-xs text-gray-500 italic">Not scored</span>;
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
    pending:  { label: "Pending Review", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    approved: { label: "Approved",       color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    rejected: { label: "Rejected",       color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    draft:    { label: "Draft",          color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
    active:   { label: "Active",         color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
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
      target_amount, risk_score, category,
      profiles:owner_id ( full_name, user_id ),
      businesses:business_id ( business_name )
    `)
    .order("created_at", { ascending: false });

  const pending   = campaigns?.filter((c) => c.status === "pending")  ?? [];
  const approved  = campaigns?.filter((c) => c.status === "approved") ?? [];
  const rejected  = campaigns?.filter((c) => c.status === "rejected") ?? [];
  const all       = campaigns ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
            <BarChart2 className="text-[#a78bfa] h-8 w-8" />
            Campaign Oversight
          </h1>
          <p className="text-gray-400 text-sm">Review and approve campaign submissions before they go live.</p>
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
          { label: "Approved", value: approved.length, icon: CheckCircle, color: "#4ade80" },
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
      {(approved.length > 0 || rejected.length > 0) && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#a78bfa]" />
            All Campaigns ({all.length})
          </h2>
          <div className="flex flex-col gap-3">
            {[...approved, ...rejected].map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} compact />
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
      className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden"
      style={isPending ? { borderColor: "rgba(251,191,36,0.2)", boxShadow: "0 0 24px rgba(251,191,36,0.04)" } : {}}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-white">{campaign.title || "Untitled Campaign"}</h3>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{campaign.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {campaign.businesses?.business_name || campaign.profiles?.full_name || "Unknown Owner"}
              </span>
              {campaign.category && (
                <span className="rounded-lg bg-white/5 px-2 py-0.5">{campaign.category}</span>
              )}
              {campaign.target_amount && (
                <span>Target: <strong className="text-gray-300">ETH {Number(campaign.target_amount).toLocaleString()}</strong></span>
              )}
              <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>

            <div className="mt-3">
              <RiskBadge score={campaign.risk_score} />
            </div>
          </div>

          {/* Doc links */}
          <div className="flex flex-col gap-2 flex-shrink-0 text-xs">
            <Link
              href={`/campaigns/${campaign.id}`}
              target="_blank"
              className="text-[#a78bfa] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Campaign
            </Link>
          </div>
        </div>

        {/* Action buttons for pending */}
        {isPending && !compact && (
          <div className="mt-5 flex gap-3 pt-5 border-t border-white/5">
            <form
              action={async () => {
                "use server";
                await adminApproveCampaign(campaign.id);
              }}
            >
              <button
                type="submit"
                className="px-5 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
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
                className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
