import {Campaign } from "@/types";

export function rankCampaignsForUser(
  activeCampaigns: Campaign[],
  categoryDistribution: Record<string, number>,
  userBackedCampaignIds: Set<string | number>
) {
  return activeCampaigns
    .filter((campaign) => !userBackedCampaignIds.has(campaign.id)) // Don't recommend campaigns they already hold
    .map((campaign) => {
      let matchScore = 0;

      // 1. Portfolio Category Alignment (Max 60 pts)
      const categoryWeight = categoryDistribution[campaign.category] || 0;
      matchScore += categoryWeight * 60;

      // 2. Crowdfunding Goal Progress Bonus (Max 25 pts)
      const progressRatio = campaign.amount_pledged / (campaign.funding_goal || 1);
      if (progressRatio >= 0.5 && progressRatio < 1.0) {
        matchScore += 25; // Sweet spot: high momentum
      } else {
        matchScore += progressRatio * 20;
      }

      // 3. Category Fallback / Cold Start (Default base points if new user)
      if (Object.keys(categoryDistribution).length === 0) {
        matchScore += 10;
      }

      return {
        ...campaign,
        matchScore: Math.min(100, Math.round(matchScore)),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}