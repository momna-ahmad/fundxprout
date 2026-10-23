"use client";
// shafqaat — Campaign detail page for investor view (post-investment)
// Route: /campaigns/[id]  — id is the Supabase campaign UUID
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import { getCampaignFinancialReports } from "@/lib/marketplace-api";
import {
    Loader2, ExternalLink, FileText, ArrowLeft, ChevronDown,
    ShieldCheck, Download, CheckCircle2
} from "lucide-react";
import RiskAssessmentPanel from "@/components/RiskAssessmentPanel";

// shafqaat — Helper: calculate days left from created_at + duration
function calcDaysLeft(createdAt, durationDays) {
    const deadline = new Date(
        new Date(createdAt).getTime() + durationDays * 24 * 60 * 60 * 1000
    );
    const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function formatUsd(value) {
    const amount = Number(value);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
}

const cardClass = "rounded-3xl border border-white/[0.07] bg-[#1a2030]";

/* ------------------------------------------------------------------ */
/*  UI helper: long text that collapses to a few lines with a toggle   */
/* ------------------------------------------------------------------ */
function ExpandableText({ text, lines = 6 }) {
    const ref = useRef(null);
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const check = () => {
            if (!expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
        };
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [text, expanded]);

    const collapsedStyle = {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    };

    return (
        <div>
            <div className="relative">
                <p
                    ref={ref}
                    style={expanded ? undefined : collapsedStyle}
                    className="whitespace-pre-line text-[15px] leading-7 text-gray-300"
                >
                    {text}
                </p>
                {!expanded && overflows && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1a2030] to-transparent"
                    />
                )}
            </div>

            {overflows && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#6f42c1]/30 bg-[#6f42c1]/10 px-4 py-1.5 text-xs font-semibold text-[#a78bfa] transition hover:bg-[#6f42c1]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
                >
                    {expanded ? "Read less" : "Read more"}
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    />
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Financial reports (moved here from the investor campaigns page)    */
/* ------------------------------------------------------------------ */
function FinancialReportsSection({ reports, loading }) {
    return (
        <section className={`${cardClass} p-6 sm:p-8`}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f42c1]/15 text-[#a78bfa]">
                        <FileText className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-white">Financial reports</h2>
                        <p className="mt-0.5 text-sm text-gray-400">
                            Revenue, burn rate and cash position shared by the founders.
                        </p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs font-medium tabular-nums text-gray-300">
                    {reports.length} report{reports.length === 1 ? "" : "s"}
                </span>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#0d1117] px-4 py-4 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin text-[#a78bfa]" />
                    Loading reports...
                </div>
            ) : reports.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-[#0d1117]/60 px-4 py-5 text-sm text-gray-400">
                    The founders haven&apos;t submitted a financial report yet.
                </p>
            ) : (
                <div className="space-y-3">
                    {reports.map((report) => {
                        const isApproved = report.status === "approved";
                        const isRejected = report.status === "rejected";
                        const statusLabel = isApproved ? "Verified" : isRejected ? "Rejected" : "Under review";
                        const statusClass = isApproved
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : isRejected
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20";
                        const dotClass = isApproved ? "bg-green-400" : isRejected ? "bg-red-400" : "bg-amber-500";

                        return (
                            <details key={report.id} className="group/report overflow-hidden rounded-2xl border border-white/5 bg-[#0d1117]">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {report.period_label || `FY ${report.fiscal_year}`}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            Fiscal year {report.fiscal_year} &middot; Revenue{" "}
                                            <span className="tabular-nums text-gray-200">{formatUsd(report.gross_revenue)}</span>
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClass}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                                            {statusLabel}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 group-open/report:rotate-180" />
                                    </div>
                                </summary>

                                <div className="border-t border-white/5 px-4 py-5">
                                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {[
                                            ["Gross revenue", report.gross_revenue],
                                            ["Burn rate", report.burn_rate],
                                            ["Net income / loss", report.net_income_loss],
                                            ["Beginning cash", report.beginning_cash],
                                            ["Operating cash flow", report.operating_cash_flow],
                                            ["Ending cash", report.ending_cash],
                                        ].map(([label, value]) => (
                                            <div key={label} className="rounded-xl bg-white/[0.03] px-3.5 py-3">
                                                <dt className="text-xs text-gray-400">{label}</dt>
                                                <dd className="mt-1 text-sm font-semibold tabular-nums text-white">{formatUsd(value)}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                            <CheckCircle2 className={`h-3.5 w-3.5 ${report.is_audited ? "text-green-400" : "text-gray-600"}`} />
                                            {report.is_audited ? "Audited / independently reviewed" : "Not marked as audited"}
                                        </span>
                                        {report.file_url ? (
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={report.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#6f42c1]/30 bg-[#6f42c1]/10 px-3.5 py-1.5 text-xs font-semibold text-[#a78bfa] transition hover:bg-[#6f42c1]/20 hover:text-white"
                                                >
                                                    <ExternalLink className="h-3 w-3" /> View report
                                                </a>
                                                <a
                                                    href={report.file_url}
                                                    download
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
                                                >
                                                    <Download className="h-3 w-3" /> Download
                                                </a>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">Report file unavailable</span>
                                        )}
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function CampaignDetailPage() {
    const { id } = useParams(); // shafqaat — get campaign id from URL e.g. /campaigns/abc-123
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [financialReports, setFinancialReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);

    // shafqaat — Fetch campaign data from Supabase on load
    useEffect(() => {
        if (!id) return;
        async function fetchCampaign() {
            const data = await getCampaignById(id);
            if (!data) setNotFound(true);
            else setCampaign(data);
            setLoading(false);
        }
        fetchCampaign();
    }, [id]);

    // Financial reports for this campaign (grouped by campaign_id, never by a token row)
    useEffect(() => {
        if (!campaign?.id) return;

        async function loadReports() {
            setReportsLoading(true);
            const campaignId = Number(campaign.id);

            if (Number.isSafeInteger(campaignId) && campaignId > 0) {
                try {
                    const { reports } = await getCampaignFinancialReports([campaignId]);
                    setFinancialReports(reports || []);
                } catch (error) {
                    console.error("[Campaign financial reports]", error);
                    setFinancialReports([]);
                }
            } else {
                setFinancialReports([]);
            }
            setReportsLoading(false);
        }

        loadReports();
    }, [campaign?.id]);

    // shafqaat — Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#181A2A] flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-[#6f42c1] animate-spin" />
            </div>
        );
    }

    // shafqaat — 404 state
    if (notFound) {
        return (
            <div className="min-h-screen bg-[#181A2A] flex flex-col items-center justify-center gap-4">
                <p className="text-white text-xl font-bold">Campaign not found</p>
                <Link href="/" className="text-[#a78bfa] text-sm hover:underline">
                    ← Back to all campaigns
                </Link>
            </div>
        );
    }

    const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration ?? 30);
    const isActive = daysLeft > 0;

    // shafqaat — List of all IPFS documents to display as download links
    const documents = [
        { label: "Pitch Deck", url: campaign.pitch_deck_url },
        { label: "Business Plan", url: campaign.business_plan_url },
        { label: "Financial Projections", url: campaign.financials_url },
        { label: "Use of Funds", url: campaign.use_of_funds_url },
        { label: "Product Demo", url: campaign.product_demo_url },
    ].filter((d) => d.url); // shafqaat — only show docs that were uploaded

    return (
        <div className="min-h-screen bg-[#181A2A] pb-16 pt-15">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">


                <div className="space-y-6">

                    {/* shafqaat — Campaign cover image */}
                    {campaign.image_url && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/[0.07]">
                            <Image
                                src={campaign.image_url}
                                alt={campaign.title}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                            <div
                                aria-hidden
                                className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
                            />
                            <span
                                className={`absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md ${
                                    isActive
                                        ? "bg-green-500/20 text-green-300"
                                        : "bg-red-500/20 text-red-300"
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
                                {isActive ? "Campaign active" : "Campaign ended"}
                            </span>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        {campaign.category && (
                            <span className="inline-block rounded-full border border-[#6f42c1]/30 bg-[#6f42c1]/10 px-3.5 py-1 text-xs font-semibold capitalize text-[#a78bfa]">
                                {campaign.category}
                            </span>
                        )}
                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            {campaign.title}
                        </h1>
                    </div>

                    {/* AI Risk Assessment Panel */}
                    <RiskAssessmentPanel campaign={campaign} />

                    {/* Story / pitch — collapsed by default */}
                    {campaign.description && (
                        <section className={`${cardClass} p-6 sm:p-8`}>
                            <h2 className="mb-4 text-lg font-bold tracking-tight text-white">
                                About this campaign
                            </h2>
                            <ExpandableText text={campaign.description} lines={6} />
                        </section>
                    )}

                    {/* Financial reports */}
                    <FinancialReportsSection reports={financialReports} loading={reportsLoading} />

                    {/* shafqaat — IPFS Documents section for investor due diligence */}
                    {documents.length > 0 && (
                        <section className={`${cardClass} p-6 sm:p-8`}>
                            <div className="mb-5 flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6f42c1]/15 text-[#a78bfa]">
                                    <FileText className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-white">
                                        Campaign documents
                                    </h2>
                                    <p className="mt-0.5 text-sm text-gray-400">
                                        Stored on IPFS, so they&apos;re tamper-proof and permanently verifiable.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {documents.map((doc) => (
                                    // shafqaat — Each document opens in a new tab from IPFS gateway
                                    <a
                                        key={doc.label}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0d1117] p-3.5 transition hover:border-[#6f42c1]/50"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition group-hover:bg-[#6f42c1]/15 group-hover:text-[#a78bfa]">
                                            <FileText className="h-4 w-4" />
                                        </span>
                                        <span className="flex-1 truncate text-sm font-medium text-gray-200 group-hover:text-white">
                                            {doc.label}
                                        </span>
                                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-600 transition group-hover:text-[#a78bfa]" />
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* shafqaat — Blockchain transaction verification link */}
                    {campaign.transaction_hash && (
                        <section className={`${cardClass} flex items-center gap-4 p-5 sm:p-6`}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-bold text-white">On-chain verification</h2>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${campaign.transaction_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={campaign.transaction_hash}
                                    className="mt-1 flex items-center gap-1.5 text-xs text-[#a78bfa] transition hover:text-white"
                                >
                                    <span className="truncate font-mono">{campaign.transaction_hash}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}