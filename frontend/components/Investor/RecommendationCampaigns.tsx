"use client";
import { useEffect, useState } from "react";
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

      const ranked: (Campaign & { matchScore: number })[] =
        await getRecommendedCampaigns(4, categoryDistribution, userBackedCampaignIds);

      if (!ranked || ranked.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      setRecommendations(ranked);
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

  // Hide the recommendation area when no personalized campaign meets the threshold.
  if (recommendations.length === 0) {
    return null;
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