"use client";
import { useEffect, useState } from "react";
import { rankCampaignsForUser } from "@/utils/recommendations"; // 1. Import utility

import { getRecommendedCampaigns } from "@/utils/supabase/getCampaigns"; 
import { Campaign } from "@/types";

interface Props {
  categoryDistribution?: Record<string, number>;
  userBackedCampaignIds?: (string | number)[];
}

export default function RecommendationCampaigns({
  categoryDistribution = {},
  userBackedCampaignIds = [],
}: Props) {
  const [recommendations, setRecommendations] = useState<(Campaign & { matchScore: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAndRank() {
      setLoading(true);

      // 1. Fetch raw active campaigns from Supabase
      const rawCampaigns: Campaign[] = await getRecommendedCampaigns();

      if (!rawCampaigns || rawCampaigns.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      // 2. Convert backed IDs array into a Set for fast lookup
      const backedSet = new Set(userBackedCampaignIds);

      // 3. Execute your ranking function
      const ranked = rankCampaignsForUser(rawCampaigns, categoryDistribution, backedSet);
      console.log(ranked)

      // 4. Take the top 3 recommendations
      setRecommendations(ranked.slice(0, 3));
      setLoading(false);
    }

    loadAndRank();
  }, [categoryDistribution, userBackedCampaignIds]);

  // ── Skeleton Loading State ──
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-white/5 rounded-2xl p-5 animate-pulse h-[170px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="w-20 h-3.5 bg-white/10 rounded" />
              <div className="w-16 h-5 bg-purple-500/10 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="w-3/4 h-4 bg-white/10 rounded" />
              <div className="w-full h-3 bg-white/5 rounded" />
            </div>
            <div className="w-full h-8 bg-white/10 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  // ── Fallback Message (No Active / Matching Campaigns) ──
  if (recommendations.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-white/10 bg-card/40 p-8 text-center">
        <h3 className="text-sm font-semibold text-white">No recommended campaigns available</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          You've backed all matching campaigns, or no new business opportunities match your portfolio preferences right now.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3.5">
      {recommendations.map((camp) => (
        <div key={camp.id} className="bg-card border border-white/5 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase">{camp.category}</span>
            <span className="bg-purple-500/20 text-[#a78bfa] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {camp.matchScore}% Match
            </span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">{camp.title}</h3>
          <p className="text-xs text-gray-400 line-clamp-2 my-2">{camp.description}</p>
          <a
            href={`/campaigns/${camp.id}`}
            className="block text-center w-full bg-[#6f42c1]/20 hover:bg-[#6f42c1] text-white text-xs font-semibold py-2 rounded-xl transition-all mt-3"
          >
            View Campaign
          </a>
        </div>
      ))}
    </div>
  );
}