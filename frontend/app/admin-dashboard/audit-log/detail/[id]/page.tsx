"use client";

import { useEffect, useState } from "react";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import { createClient } from "@/utils/supabase/client";
import { Check, ExternalLink, Flag, Loader2, ShieldCheck, FileText, Calculator, FileCheck } from "lucide-react";
import CampaignReviewActions from "@/components/admin/campaign-review-actions";
import { useParams, useSearchParams } from "next/navigation";

type CampaignReviewProps = {
  campaign: {
    id: string | number;
    title?: string | null;
    category?: string | null;
    created_at?: string | null;
    valuation?: number | string | null;
    owner?: string | null;
    kyb_verified?: boolean | null;
    pitch_deck_url?: string | null;
    business_plan_url?: string | null;
    financials_url?: string | null;
    use_of_funds_url?: string | null;
    product_demo_url?: string | null;
  };
};

type FinancialAudit = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  currency?: string | null;
  unit_scale?: string | null;
  reporting_type?: string | null;
  period_label?: string | null;
  is_audited?: boolean | null;
  total_revenue?: number | null;
  revenue_operations?: number | null;
  other_income?: number | null;
  net_profit?: number | null;
  employee_expenses?: number | null;
  operating_expenses?: number | null;
  profit_before_tax?: number | null;
  confidence_score?: number | null;
};

const scorecard = [
  { label: "Solid idea & prototype", value: 420000, maximum: 500000 },
  { label: "Founding team experience", value: 380000, maximum: 500000 },
  { label: "Strategic partnerships / beta users", value: 150000, maximum: 500000 },
  { label: "Product rollout / IP", value: 200000, maximum: 500000 },
];

const formatMoney = (value: number | string | null | undefined) =>
  `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function CampaignReview() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState<CampaignReviewProps["campaign"] | null>(null);
  const [audit, setAudit] = useState<FinancialAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchCampaign() {
      try {
        setLoading(true);
        setAuditLoading(true);
        const supabase = createClient();

        // 1. Fetch Campaign
        const data = await getCampaignById(String(id));
        if (!data) {
          setCampaign(null);
          return;
        }

        // 2. Fetch KYB
        const ownerId = searchParams.get("ownerId") || data.owner;
        let kybVerified = false;
        if (ownerId) {
          const { data: business } = await supabase
            .from("businesses")
            .select("kyb_verified")
            .eq("owner_id", ownerId)
            .maybeSingle();

          kybVerified = business?.kyb_verified === true;
        }
        setCampaign({ ...data, kyb_verified: kybVerified });

        // 3. Fetch Financial Audit Row
        const { data: auditData, error } = await supabase
          .from("campaign_financial_audits")
          .select("*")
          .eq("campaign_id", Number(id))
          .limit(1)
          .maybeSingle();

        console.log("Fetched audit data:", auditData, id, error);

        setAudit(auditData);
      } catch (err) {
        console.error("Error fetching campaign data:", err);
      } finally {
        setLoading(false);
        setAuditLoading(false);
      }
    }
    fetchCampaign();
  }, [id, searchParams]);

  const calculatedValuation = scorecard.reduce((total, item) => total + item.value, 0);
  const kybVerified = campaign?.kyb_verified === true;
  const documents = [
    { label: "Pitch Deck", url: campaign?.pitch_deck_url },
    { label: "Business Plan", url: campaign?.business_plan_url },
    { label: "Financial Projections", url: campaign?.financials_url },
    { label: "Use of Funds", url: campaign?.use_of_funds_url },
    { label: "Product Demo", url: campaign?.product_demo_url },
  ];

  return (
    <section className="min-h-screen bg-[#181A2A] text-white p-5 sm:p-8 pt-20 sm:pt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {loading ? "Loading campaign..." : campaign?.title || "Campaign Review"}
              </h1>
              {campaign?.category && (
                <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  {campaign.category}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {campaign?.created_at
                ? `Submitted on ${new Date(campaign.created_at).toLocaleDateString()}`
                : "Awaiting submission details"}
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Left Column */}
          <div className="space-y-6">
            <ReviewBox title="Verification Checklist" icon={ShieldCheck}>
              <ChecklistRow
                label="KYB verification (businesses.kyb_verified)"
                verified={kybVerified}
              />
              <ChecklistRow
                label="Company registration / KYB documents"
                verified={kybVerified}
              />
              <ChecklistRow
                label="Cap table audit (pre-round ownership)"
                verified={kybVerified}
              />
              <ChecklistRow
                label="Bank statements & financial records"
                verified={kybVerified}
              />
              <div className="flex items-center justify-between gap-4 py-3 text-xs border-b border-white/5 last:border-b-0">
                <span className="text-gray-300">Founder background & traction claims</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium">
                  <Flag className="h-3 w-3" /> Needs second look
                </span>
              </div>
            </ReviewBox>

            <ReviewBox title="Documents" icon={FileText}>
              <div className="divide-y divide-white/5">
                {documents.map(
                  (document) =>
                    document.url && (
                      <a
                        key={document.label}
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-4 py-3 text-xs text-gray-300 hover:text-white"
                      >
                        <span>{document.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    )
                )}
                {!documents.some((document) => document.url) && (
                  <p className="py-3 text-xs text-gray-500">No campaign documents uploaded.</p>
                )}
              </div>
            </ReviewBox>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Extracted Financials */}
            <ReviewBox title="AI Financial Audit" icon={Calculator}>
              {auditLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8b5cf6]" />
                  <span>Loading extracted financials...</span>
                </div>
              ) : !audit ? (
                <p className="text-xs text-gray-400 py-3">No financial extraction records found.</p>
              ) : audit.status === "processing" || audit.status === "pending" ? (
                <div className="flex items-center gap-2 py-3 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI extraction in progress ({audit.status})...</span>
                </div>
              ) : audit.status === "failed" ? (
                <div className="py-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 rounded-xl">
                  Extraction failed. Manual review required.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/5">
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      {audit.reporting_type || "Consolidated"}
                    </span>
                    <span className="text-[11px] text-gray-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                      Scale: {audit.unit_scale || "Exact"}
                    </span>
                    <span className="text-[11px] text-gray-300 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                      {audit.period_label || "Recent"}
                    </span>
                    {audit.confidence_score && (
                      <span className="text-[11px] text-emerald-400 ml-auto font-mono">
                        {(Number(audit.confidence_score) * 100).toFixed(0)}% Confidence
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#0f111a] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[11px]">Total Revenue</span>
                      <span className="text-base font-bold text-white font-mono mt-0.5 block">
                        {audit.currency || "$"}{Number(audit.total_revenue || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#0f111a] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[11px]">Net Profit (PAT)</span>
                      <span
                        className={`text-base font-bold font-mono mt-0.5 block ${
                          Number(audit.net_profit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {audit.currency || "$"}{Number(audit.net_profit || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#0f111a] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[11px]">Staff / Personnel</span>
                      <span className="text-sm font-semibold text-gray-200 font-mono mt-0.5 block">
                        {audit.currency || "$"}{Number(audit.employee_expenses || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#0f111a] p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block text-[11px]">Operating Expenses</span>
                      <span className="text-sm font-semibold text-gray-200 font-mono mt-0.5 block">
                        {audit.currency || "$"}{Number(audit.operating_expenses || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </ReviewBox>         

            {/* Review Actions */}
            <ReviewBox title="Review Actions" icon={FileCheck}>
              <CampaignReviewActions
                key={String(campaign?.valuation ?? calculatedValuation)}
                campaignId={String(campaign?.id || id)}
                valuation={campaign?.valuation ?? calculatedValuation}
                className="w-full"
              />
            </ReviewBox>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewBox({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1a2030] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
        {Icon && <Icon className="w-5 h-5 text-[#6f42c1]" />}
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ChecklistRow({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-xs border-b border-white/5 last:border-b-0">
      <span className="text-gray-300">{label}</span>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
          verified
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
        }`}
      >
        {verified ? <Check className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
        {verified ? "Verified" : "Pending"}
      </span>
    </div>
  );
}