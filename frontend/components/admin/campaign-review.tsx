"use client";

import { Check, Flag, Loader2 } from "lucide-react";
import CampaignReviewActions from "@/components/admin/campaign-review-actions";

type CampaignReviewProps = {
  campaign: {
    id: string | number;
    title?: string | null;
    category?: string | null;
    created_at?: string | null;
    valuation?: number | string | null;
    kyb_verified?: boolean | null;
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

export default function CampaignReview({ campaign }: CampaignReviewProps) {
  const calculatedValuation = scorecard.reduce((total, item) => total + item.value, 0);
  const kybVerified = campaign.kyb_verified === true;

  return (
    <section className="bg-[#f5f4f1] text-[#101b3f] p-5 sm:p-8 font-mono">
      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl">{campaign.title || "Campaign review"}</h1>
        <p className="text-[11px] text-[#46506f] mt-1">
          {campaign.category || "Campaign"} · {campaign.created_at ? `Submitted ${new Date(campaign.created_at).toLocaleDateString()}` : "Awaiting review"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <ReviewBox title="Verification checklist">
            <ChecklistRow label="KYB verification (businesses.kyb_verified)" verified={kybVerified} />
            <ChecklistRow label="Company registration / KYB documents" verified={kybVerified} />
            <ChecklistRow label="Cap table audit (pre-round ownership)" verified={kybVerified} />
            <ChecklistRow label="Bank statements & financial records" verified={kybVerified} />
            <div className="flex items-center justify-between gap-4 border-b border-[#dddcd7] py-3 text-[11px] last:border-b-0">
              <span>Founder background & traction claims</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[#a56c00]"><Flag className="h-3 w-3" /> Needs second look</span>
            </div>
          </ReviewBox>

          <ReviewBox title="Cap table (pre-round)">
            <StatRow label="Founders" value="72%" />
            <StatRow label="Angel investors" value="18%" />
            <StatRow label="Employee option pool" value="10%" />
            <StatRow label="Total existing tokens" value="1,000,000" />
          </ReviewBox>
        </div>

        <div className="space-y-5">
          <ReviewBox title="Valuation - Scorecard method">
            {scorecard.map((item) => (
              <div key={item.label} className="mb-3 last:mb-0">
                <div className="mb-1 flex justify-between gap-3 text-[11px]">
                  <span>{item.label}</span>
                  <span className="shrink-0">{formatMoney(item.value)} / {formatMoney(item.maximum)}</span>
                </div>
                <div className="h-2 bg-[#e5e4df]">
                  <div className="h-full bg-[#202c65]" style={{ width: `${(item.value / item.maximum) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between border-t border-[#d8d7d1] pt-3 text-xs">
              <span>System-calculated valuation</span>
              <strong className="font-serif text-xl">{formatMoney(calculatedValuation)}</strong>
            </div>
          </ReviewBox>

          <ReviewBox title="Review actions">
            <CampaignReviewActions
              campaignId={String(campaign.id)}
              valuation={campaign.valuation ?? calculatedValuation}
              className="font-mono"
            />
          </ReviewBox>
        </div>
      </div>
    </section>
  );
}

function ReviewBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#d9d8d2] bg-[#fffefa] p-5">
      <h2 className="mb-3 border-b border-[#d9d8d2] pb-3 font-serif text-base">{title}</h2>
      {children}
    </div>
  );
}

function ChecklistRow({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#dddcd7] py-3 text-[11px]">
      <span>{label}</span>
      <span className={`inline-flex shrink-0 items-center gap-1 ${verified ? "text-[#176b62]" : "text-[#a56c00]"}`}>
        {verified ? <Check className="h-3 w-3" /> : <Loader2 className="h-3 w-3" />}
        {verified ? "Verified" : "Pending"}
      </span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between py-1.5 text-[11px]"><span>{label}</span><strong>{value}</strong></div>;
}