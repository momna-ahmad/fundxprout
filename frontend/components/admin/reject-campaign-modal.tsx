"use client";

import { FormEvent, useState } from "react";
import { Loader2, X } from "lucide-react";

type RejectCampaignModalProps = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (rejectionReason: string, internalNotes: string) => void;
};

export default function RejectCampaignModal({
  open,
  pending,
  onClose,
  onSubmit,
}: RejectCampaignModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(rejectionReason.trim(), internalNotes.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-campaign-title"
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a2030] p-6 text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="reject-campaign-title" className="text-lg font-bold">Reject campaign</h2>
            <p className="mt-1 text-xs text-gray-400">Record why this campaign is being rejected.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close rejection modal"
            className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-gray-300">
            Rejection reason <span className="text-red-400">*</span>
            <textarea
              required
              autoFocus
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Explain why the campaign does not meet review requirements"
              rows={4}
              className="mt-2 block w-full resize-y rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm font-normal text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/60"
            />
          </label>

          <label className="block text-xs font-semibold text-gray-300">
            Internal notes
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Add notes for the internal review team"
              rows={3}
              className="mt-2 block w-full resize-y rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm font-normal text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1]"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !rejectionReason.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reject campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}