// Path in your project: app/admin/audit-log/page.jsx
import { createClient } from "@/utils/supabase/server";
import { ScrollText } from "lucide-react";
import CampaignReview from "@/components/admin/campaign-review";
import Link from "next/link";

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    approved_override: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    deployed: "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20",
  };
  const labels: Record<string, string> = {
    approved: "Approved",
    approved_override: "Approved (override)",
    rejected: "Rejected",
    deployed: "Deployed on-chain",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs border ${map[action] || map.approved}`}>
      {labels[action] || action}
    </span>
  );
}

export default async function AuditLogPage() {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, owner, funding_goal, valuation, created_at, status")
    .eq("status", "in_review")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
          <ScrollText className="text-[#a78bfa] h-8 w-8" />
          Audit Log
        </h1>
        <p className="text-gray-400">Every valuation decision and deployment, timestamped for regulatory review.</p>
      </div>

      <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-white/5">
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Admin</th>
              <th className="p-4 font-medium">Calculated → Approved</th>
              <th className="p-4 font-medium">Funding Goal</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!campaigns || campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No campaigns awaiting review.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 text-gray-400 font-mono text-xs">
                      {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-4 text-white font-medium">{campaign.title}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{campaign.owner}</td>
                    <td className="p-4 text-gray-400">{campaign.valuation ?? "—"}</td>
                    <td className="p-4 text-gray-400">{campaign.funding_goal ?? "—"}</td>
                    <td className="p-4 text-gray-400">
                    <Link
                      href={`/admin/audit-log/detail/${campaign.id}?ownerId=${encodeURIComponent(campaign.owner)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition"
                      >
                        View
                    </Link>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}