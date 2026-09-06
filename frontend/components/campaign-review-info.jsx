"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

export default function CampaignReviewInfo({ review }) {
  const [open, setOpen] = useState(false);

  if (!review) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Show campaign review information"
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-500/60 text-gray-400 transition hover:border-[#a78bfa] hover:text-[#a78bfa]"
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-30 w-72 rounded-xl border border-white/10 bg-[#1a2030] p-4 text-left shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Review information</p>
              {review.action && (
                <p className="mt-1 text-[11px] capitalize text-gray-400">
                  Action: {review.action.replaceAll("_", " ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close review information"
              className="text-gray-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-[11px]">
            <div>
              <p className="font-semibold text-gray-400">Rejection reason</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-200">
                {review.rejection_reason || "No rejection reason recorded."}
              </p>
            </div>
            {review.internal_notes && (
              <div>
                <p className="font-semibold text-gray-400">Internal notes</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-200">{review.internal_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}