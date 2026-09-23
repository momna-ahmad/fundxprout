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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        setError("Please upload a valid PDF document.");
        return;
      }
      if (selected.size > 25 * 1024 * 1024) {
        setError("File size must not exceed 25MB.");
        return;
      }
      setError(null);
      setFile(selected);
    }
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
      <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1a2030] rounded-3xl border border-white/5 p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
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
    <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-white mb-1">
              Periodic Financial Disclosure
            </h1>
            <p className="text-gray-400 text-sm">
              Upload compliance statements and headline metrics for{" "}
              <span className="text-white font-medium">{companyName}</span> (ID: #{campaignId}).
            </p>
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

            {/* Headline Metrics Grid */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-white mb-1">
                  Headline Financial Metrics (USD)
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
            </div>

            {/* Document Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Financial Report Package (PDF) *
              </label>
              <div className="border-2 border-dashed border-white/10 hover:border-[#6f42c1] rounded-2xl p-6 text-center bg-[#0d1117] transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <div className="flex items-center gap-2 text-white font-medium text-sm mt-1">
                      <FileText className="h-4 w-4 text-[#a78bfa]" />
                      <span>{file.name}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to submit
                    </p>
                    <span className="text-xs text-[#a78bfa] hover:underline cursor-pointer mt-1">
                      Replace document
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <span className="text-[#a78bfa] text-sm font-semibold">
                      Click to upload
                    </span>{" "}
                    <span className="text-gray-400 text-sm">or drag and drop</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Balance Sheet, Income Statement, & Cash Flows (PDF up to 25 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification and Attestation */}
            <div className="space-y-4 pt-1">
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-full transition duration-200 text-sm flex items-center gap-2"
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