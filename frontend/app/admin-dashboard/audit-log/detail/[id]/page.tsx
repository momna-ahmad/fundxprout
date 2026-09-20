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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchCampaign() {
      try {
        setLoading(true);
        const data = await getCampaignById(String(id));
        if (!data) {
          setCampaign(null);
          return;
        }

        const ownerId = searchParams.get("ownerId") || data.owner;
        let kybVerified = false;
        if (ownerId) {
          const supabase = createClient();
          const { data: business, error } = await supabase
            .from("businesses")
            .select("kyb_verified")
            .eq("owner_id", ownerId)
            .maybeSingle();

          if (error) {
            console.error("Error fetching campaign owner KYB status:", error);
          }
          kybVerified = business?.kyb_verified === true;
        }

        setCampaign({ ...data, kyb_verified: kybVerified });
      } catch (err) {
        console.error("Error fetching campaign:", err);
      } finally {
        setLoading(false);
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
    <section className="min-h-screen bg-[#181A2A] text-white p-5 sm:p-8 pt-24">
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a2030] border border-white/5 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Admin Review Mode
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
                {documents.map((document) => document.url && (
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
                ))}
                {!documents.some((document) => document.url) && (
                  <p className="py-3 text-xs text-gray-500">No campaign documents uploaded.</p>
                )}
              </div>
            </ReviewBox>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ReviewBox title="Valuation - Scorecard Method" icon={Calculator}>
              <div className="space-y-4">
                {scorecard.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-gray-300 font-medium font-mono">
                        {formatMoney(item.value)} / {formatMoney(item.maximum)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0d1117] rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-[#6f42c1] to-[#8b5cf6] rounded-full transition-all duration-500"
                        style={{ width: `${(item.value / item.maximum) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <span className="text-xs text-gray-400">System-calculated valuation</span>
                  <p className="text-[11px] text-gray-500">Based on Berkus / Milestone weights</p>
                </div>
                <strong className="text-2xl font-bold text-white tracking-tight">
                  {formatMoney(calculatedValuation)}
                </strong>
              </div>
            </ReviewBox>

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

