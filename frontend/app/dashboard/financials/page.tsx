"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  DollarSign,
  Calendar,
  ShieldCheck,
} from "lucide-react";

interface UploadFormProps {
  campaignId: number | string;
  companyName: string;
}

export default function FinancialReportUploadForm({
  companyName,
}: UploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");

  const [formData, setFormData] = useState({
    fiscalYear: new Date().getFullYear(),
    periodLabel: `FY ${new Date().getFullYear() - 1}`,
    frequency: "annual",
    grossRevenue: "",
    operatingExpenses: "",
    netIncome: "",
    beginningCash: "",
    operatingCashFlow: "",
    endingCash: "",
    officerName: "",
    officerTitle: "",
    isAudited: false,
    certifiedAccurate: false,
  });

  const inputClass =
    "w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setError("Please upload a valid PDF document.");
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      setFile(null);
      setError("File size must not exceed 25MB.");
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please attach the complete financial statement PDF.");
      return;
    }

    if (!formData.certifiedAccurate) {
      setError("You must certify the accuracy of these financial disclosures.");
      return;
    }

    const beg = parseFloat(formData.beginningCash);
    const end = parseFloat(formData.endingCash);

    if (!isNaN(beg) && !isNaN(end) && end < 0) {
      setError("Ending cash cannot be negative. Please verify your entries.");
      return;
    }

    setLoading(true);

    try {
      const submission = new FormData();
        submission.append("campaign_id", campaignId ? String(campaignId) : "");
        submission.append("file", file);

        Object.entries(formData).forEach(([key, value]) => {
        // Safely convert value to string even if null or undefined
        submission.append(key, value !== undefined && value !== null ? String(value) : "");
        });


      const res = await fetch("/api/reports/upload", {
        method: "POST",
        body: submission,
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Failed to submit financial report");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#181A2A] px-4 py-8 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-5 rounded-3xl border border-white/10 bg-[#1a2030] p-6 text-center shadow-xl shadow-black/10 sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
              <CheckCircle className="h-8 w-8 text-emerald-300" />
            </div>
            <h2 className="text-2xl font-black text-white">
              Financial Report Submitted
            </h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">
              Your financial disclosure for{" "}
              <span className="text-white font-medium">{companyName}</span> (
              {formData.periodLabel}) has been saved. Key headline metrics will
              reflect on your secondary market profile once validated.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setFile(null);
                }}
                className="px-6 py-3 bg-[#6f42c1] hover:bg-[#5a3599] text-white font-semibold rounded-full transition duration-200 text-sm"
              >
                Upload Another Period
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#181A2A] px-4 py-8 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-7 rounded-3xl border border-white/10 bg-[#1a2030] p-5 shadow-xl shadow-black/10 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 border-b border-white/10 pb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#a78bfa]/20 bg-[#6f42c1]/15">
              <FileText className="h-6 w-6 text-[#c4b5fd]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Financial Disclosure
                </h1>
                <span className="rounded-full border border-[#a78bfa]/20 bg-[#6f42c1]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c4b5fd]">
                  Secure submission
                </span>
              </div>
              <p className="text-sm leading-6 text-gray-400">
                Submit a reporting period and financial statement for <span className="font-medium text-gray-200">{companyName}</span>
                {campaignId && <span className="text-gray-500"> · Campaign #{campaignId}</span>}.
              </p>
            </div>
          </div>

          {/* Feedback error message */}
          {error && (
            <div className="p-4 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {campaignId && (
                <input type="hidden" name="campaign_id" value={campaignId} />
            )}

            {/* Filing Scope & Period */}
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-white">Reporting period</h2>
                <p className="mt-1 text-xs text-gray-500">Choose the period covered by this financial report.</p>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Filing Type *
                </label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="annual" className="bg-[#1a2030]">
                    Annual (Form C-AR)
                  </option>
                  <option value="quarterly" className="bg-[#1a2030]">
                    Quarterly Management
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Fiscal Year *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    name="fiscalYear"
                    value={formData.fiscalYear}
                    onChange={handleChange}
                    className={inputClass + " pl-10"}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Period Label *
                </label>
                <input
                  type="text"
                  name="periodLabel"
                  value={formData.periodLabel}
                  onChange={handleChange}
                  placeholder="e.g. FY 2025 or Q2 2026"
                  className={inputClass}
                  required
                />
              </div>
            </div>
            </section>

            {/* Headline Metrics Grid */}
            <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-white mb-1">
                  Headline financial metrics <span className="text-xs font-normal text-gray-400">(USD)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  These metrics populate secondary market diligence overviews for token buyers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Gross Revenue *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="grossRevenue"
                      value={formData.grossRevenue}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Operating Expenses *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="operatingExpenses"
                      value={formData.operatingExpenses}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Net Income / (Loss) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="netIncome"
                      value={formData.netIncome}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Beginning Cash *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="beginningCash"
                      value={formData.beginningCash}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Operating Cash Flow *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="operatingCashFlow"
                      value={formData.operatingCashFlow}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Ending Cash Balance *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      name="endingCash"
                      value={formData.endingCash}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={inputClass + " pl-10"}
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Document Upload Area */}
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Financial report document <span className="text-[#c4b5fd]">*</span></h2>
                <p className="mt-1 text-xs text-gray-500">Attach one PDF containing your balance sheet, income statement, and cash flow statement.</p>
              </div>
              <div
                onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  selectFile(event.dataTransfer.files?.[0]);
                }}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${isDragging ? "border-[#a78bfa] bg-[#6f42c1]/15" : file ? "border-emerald-400/30 bg-emerald-400/[0.04]" : "border-white/15 bg-[#0d1117] hover:border-[#a78bfa]/60 hover:bg-white/[0.02]"}`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  aria-label="Upload financial report PDF"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
                      <CheckCircle className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="flex max-w-full items-center gap-2 text-sm font-medium text-white">
                      <FileText className="h-4 w-4 shrink-0 text-[#c4b5fd]" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to submit</p>
                    <span className="mt-2 text-xs font-medium text-[#c4b5fd]">Choose another PDF to replace</span>
                  </div>
                ) : (
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Upload className="h-5 w-5 text-[#c4b5fd]" />
                    </div>
                    <p className="text-sm"><span className="font-semibold text-[#c4b5fd]">Click to choose a file</span><span className="text-gray-400"> or drag it here</span></p>
                    <p className="mt-1 text-xs text-gray-500">PDF only · Maximum file size 25 MB</p>
                  </div>
                )}
              </div>
            </section>

            {/* Verification and Attestation */}
            <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-semibold text-white">Certification</h2>
                <p className="mt-1 text-xs text-gray-500">Confirm the reporting details and identify the responsible officer.</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAudited"
                  checked={formData.isAudited}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-white/10 bg-[#0d1117] text-[#6f42c1] focus:ring-0 focus:ring-offset-0"
                />
                <span>
                  These accounts have been audited or independently reviewed by a certified CPA firm.
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Certifying Officer Full Name *
                  </label>
                  <input
                    type="text"
                    name="officerName"
                    value={formData.officerName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                    Officer Designation / Title *
                  </label>
                  <input
                    type="text"
                    name="officerTitle"
                    value={formData.officerTitle}
                    onChange={handleChange}
                    placeholder="e.g. Chief Executive Officer"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 text-xs text-gray-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="certifiedAccurate"
                  checked={formData.certifiedAccurate}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 mt-0.5 rounded border-white/10 bg-[#0d1117] text-[#6f42c1] focus:ring-0 focus:ring-offset-0"
                />
                <span>
                  I declare under penalty of platform suspension that the disclosures provided are accurate, reflect authentic business ledgers, and comply with platform issuer covenants.
                </span>
              </label>
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-500">Your report will be securely submitted for validation.</p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a78bfa]/30 bg-[#6f42c1] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6f42c1]/10 transition duration-200 hover:bg-[#5a3599] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Validating & Uploading…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Submit Financial Disclosure</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
