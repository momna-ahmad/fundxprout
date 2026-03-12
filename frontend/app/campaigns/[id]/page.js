"use client";
// shafqaat — Campaign detail page for investor view
// Route: /campaigns/[id]  — id is the Supabase campaign UUID
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import {
    Loader2, ExternalLink, FileText, Calendar, Target,
    ArrowLeft, Clock
} from "lucide-react";

// shafqaat — Helper: calculate days left from created_at + duration
function calcDaysLeft(createdAt, durationDays) {
    const deadline = new Date(
        new Date(createdAt).getTime() + durationDays * 24 * 60 * 60 * 1000
    );
    const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

export default function CampaignDetailPage() {
    const { id } = useParams(); // shafqaat — get campaign id from URL e.g. /campaigns/abc-123
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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
                <Link href="/homepage" className="text-[#a78bfa] text-sm hover:underline">
                    ← Back to all campaigns
                </Link>
            </div>
        );
    }

    const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration ?? 30);
    const goal = parseFloat(campaign.funding_goal ?? 0).toFixed(4);

    // shafqaat — List of all IPFS documents to display as download links
    const documents = [
        { label: "Pitch Deck", url: campaign.pitch_deck_url },
        { label: "Business Plan", url: campaign.business_plan_url },
        { label: "Financial Projections", url: campaign.financials_url },
        { label: "Use of Funds", url: campaign.use_of_funds_url },
        { label: "Product Demo", url: campaign.product_demo_url },
    ].filter((d) => d.url); // shafqaat — only show docs that were uploaded

    return (
        <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* shafqaat — Back button */}
                <Link
                    href="/homepage"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All Campaigns
                </Link>

                {/* shafqaat — Campaign cover image */}
                {campaign.image_url && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-8">
                        <Image
                            src={campaign.image_url}
                            alt={campaign.title}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* shafqaat — Left column: title + description */}
                    <div className="lg:col-span-2 space-y-6">

                        <div>
                            <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-widest capitalize">
                                {campaign.category}
                            </span>
                            <h1 className="text-3xl font-black text-white mt-1 mb-3">
                                {campaign.title}
                            </h1>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {campaign.description}
                            </p>
                        </div>

                        {/* shafqaat — IPFS Documents section for investor due diligence */}
                        {documents.length > 0 && (
                            <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-6">
                                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-[#a78bfa]" />
                                    Campaign Documents
                                </h2>
                                <p className="text-xs text-gray-500 mb-4">
                                    All documents are stored on IPFS — tamper-proof and permanently verifiable.
                                </p>
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        // shafqaat — Each document opens in a new tab from IPFS gateway
                                        <a
                                            key={doc.label}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 bg-[#0d1117] rounded-xl border border-white/5 hover:border-[#6f42c1]/40 transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-gray-500 group-hover:text-[#a78bfa] transition" />
                                                <span className="text-sm text-gray-300 group-hover:text-white transition">
                                                    {doc.label}
                                                </span>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-[#a78bfa] transition" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* shafqaat — Blockchain transaction verification link */}
                        {campaign.transaction_hash && (
                            <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-white mb-2">
                                    On-Chain Verification
                                </h2>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${campaign.transaction_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-[#a78bfa] hover:text-white transition break-all"
                                >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    {campaign.transaction_hash}
                                </a>
                            </div>
                        )}

                    </div>

                    {/* shafqaat — Right column: invest box */}
                    <div className="space-y-4">
                        <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-6 sticky top-24">

                            <div className="space-y-4 mb-6">
                                {/* shafqaat — Funding goal */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                        <Target className="h-3 w-3" /> Funding Goal
                                    </p>
                                    <p className="text-2xl font-black text-white">{goal} ETH</p>
                                </div>

                                {/* shafqaat — Days remaining */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Time Remaining
                                    </p>
                                    <p className="text-lg font-bold text-white">
                                        {daysLeft > 0 ? `${daysLeft} days` : "Campaign Ended"}
                                    </p>
                                </div>

                                {/* shafqaat — Price per token */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Price Per Token</p>
                                    <p className="text-sm font-semibold text-[#a78bfa]">
                                        {parseFloat(campaign.price_per_token ?? 0).toFixed(6)} ETH
                                    </p>
                                </div>
                            </div>

                            {/* shafqaat — Invest button (wiring to blockchain comes in Week 5) */}
                            <button
                                disabled={daysLeft === 0}
                                className="w-full bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition text-sm"
                            >
                                {daysLeft > 0 ? "Invest Now" : "Campaign Ended"}
                            </button>

                            <p className="text-xs text-gray-600 text-center mt-3">
                                MetaMask required to invest
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
