"use client";

import { useState } from "react";
import { Loader2, Send, Target } from "lucide-react";
import { submitCampaignForReview } from "@/lib/action";

export default function CampaignStatusButton({ status, campaignId, isComplete, isPending }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "draft") {
    const handleSubmitForReview = async () => {
      if (!isComplete) return;
      setIsSubmitting(true);
      const result = await submitCampaignForReview(campaignId);
      setIsSubmitting(false);

      if (result.error) {
        alert(result.error);
        return;
      }

      window.location.href = "/dashboard";
    };

    return (
      <button
        type="button"
        onClick={handleSubmitForReview}
        disabled={isSubmitting || !isComplete || !campaignId}
        className="flex-1 bg-[#037dd6] hover:bg-[#026bb5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 text-sm"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {isSubmitting ? "Submitting…" : "Submit for Review"}
      </button>
    );
  }

  if (normalizedStatus === "approved" || normalizedStatus === "adjusted") {
    return (
      <button
        type="submit"
        disabled={!isComplete || isPending}
        className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 text-sm"
      >
        <Target className="h-4 w-4" />
        {isPending ? "Launching…" : "Launch Campaign"}
      </button>
    );
  }

  return (
    <div className="flex-1 rounded-full border border-white/10 px-6 py-3 text-center text-sm text-gray-400">
      {normalizedStatus === "in_review" ? "Awaiting Review" : "Campaign Not Ready to Launch"}
    </div>
  );
}
