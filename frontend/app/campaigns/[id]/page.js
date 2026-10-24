"use client";
// shafqaat — Campaign detail page for investor view
// Route: /campaigns/[id]  — id is the Supabase campaign UUID
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import { createClient } from "@/utils/supabase/client";
import {
    Loader2, ExternalLink, FileText, Calendar, Target,
    ArrowLeft, Clock, X, AlertCircle, CheckCircle2, Wallet, Network,
    ChevronDown, Users, ShieldCheck, Coins
} from "lucide-react";
import { ethers } from "ethers";
import BusinessCampaignABI from "@/abis/BusinessCampaign.json";
import {
    checkNetwork,
    switchToSepolia,
    recordInvestment,
    getInvestmentsByCampaign,
} from "@/utils/investmentUtils";//AI 
import RiskAssessmentPanel from "@/components/RiskAssessmentPanel";

// shafqaat — Helper: calculate days left from created_at + duration
function calcDaysLeft(createdAt, durationDays) {
    const deadline = new Date(
        new Date(createdAt).getTime() + durationDays * 24 * 60 * 60 * 1000
    );
    const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

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

export default function CampaignDetailPage() {
    const { id } = useParams(); // shafqaat — get campaign id from URL e.g. /campaigns/abc-123
    const router = useRouter();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // shafqaat — Investment state
    const [walletAddress, setWalletAddress] = useState(null);
    const [network, setNetwork] = useState(null);
    const [investModal, setInvestModal] = useState(false);
    const [investmentAmount, setInvestmentAmount] = useState("");
    const [isInvesting, setIsInvesting] = useState(false);
    const [investmentError, setInvestmentError] = useState("");
    const [investorCount, setInvestorCount] = useState(0);
    const [raisedAmount, setRaisedAmount] = useState(0);
    const supabase = createClient();

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

    // shafqaat — Check if user is logged in and restore wallet connection
    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setWalletAddress(null);
                return;
            }
            // Try to restore wallet address
            const stored = localStorage.getItem("investorWallet");
            if (stored) setWalletAddress(stored);
        }
        checkAuth();
    }, []);

    // shafqaat — Load total campaign investment info from Supabase
    useEffect(() => {
        if (!campaign?.id) return;

        async function loadInvestments() {
            try {
                const investments = await getInvestmentsByCampaign(campaign.id);
                const total = investments.reduce(
                    (sum, inv) => sum + (parseFloat(inv.amount) || 0),
                    0
                );
                const uniqueInvestors = new Set(
                    investments.map((inv) => inv.investor_id || inv.investor_address)
                );

                setRaisedAmount(total);
                setInvestorCount(uniqueInvestors.size);
            } catch (err) {
                console.error("Error loading campaign investments:", err);
            }
        }

        loadInvestments();
    }, [campaign?.id]);

    // shafqaat — Connect MetaMask wallet
    async function connectWallet() {
        setInvestmentError("");
        try {
            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/log-in");
                return;
            }

            if (!window.ethereum) {
                setInvestmentError("MetaMask not found. Please install it.");
                return;
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                localStorage.setItem("investorWallet", accounts[0]);

                // Auto-switch to Sepolia
                const currentChain = await checkNetwork();
                if (currentChain !== 11155111) {
                    await switchToSepolia();
                }
            }
        } catch (error) {
            console.error("Connect wallet error:", error);
            setInvestmentError(error.message || "Failed to connect wallet");
        }
    }

    // shafqaat — Validate investment prerequisites
    function validateInvestmentPrerequisites() {
        const checks = [];

        // Authentication check
        checks.push({
            label: "Logged in to account",
            passed: !!walletAddress
        });

        // Wallet connection check
        checks.push({
            label: "MetaMask wallet connected",
            passed: !!walletAddress
        });

        // Network check
        checks.push({
            label: "Connected to Sepolia testnet",
            passed: network === 11155111
        });

        // Investment amount check
        const amount = parseFloat(investmentAmount);
        checks.push({
            label: "Valid investment amount (> 0 ETH)",
            passed: amount > 0 && !isNaN(amount)
        });

        const minInvestment = parseFloat(campaign?.price_per_token ?? "0");
        checks.push({
            label: minInvestment > 0 ? `Minimum investment amount: ${minInvestment.toFixed(6)} ETH` : "No minimum token amount",
            passed: minInvestment === 0 || (amount >= minInvestment && !isNaN(amount))
        });

        // ── Funding Goal Cap Check ──────────────────────────────────────
        const fundingGoal = parseFloat(campaign?.funding_goal ?? "0");
        const amountPledged = parseFloat(campaign?.amount_pledged ?? "0");
        const remainingGoal = Math.max(0, fundingGoal - amountPledged);

        checks.push({
            label: remainingGoal > 0 
                ? `Investment must be ≤ remaining goal (${remainingGoal.toFixed(4)} ETH)`
                : "Campaign funding goal already met",
            passed: remainingGoal > 0 && !isNaN(amount) && amount <= remainingGoal
        });
        // ────────────────────────────────────────────────────────────────

        // Campaign active check
        const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration ?? 30);
        checks.push({
            label: "Campaign is still active",
            passed: daysLeft > 0
        });

        // Campaign deployed check
        checks.push({
            label: "Campaign smart contract deployed",
            passed: !!campaign.contract_address
        });

        return checks;
    }

    // shafqaat — Execute investment on blockchain
    async function investInCampaign() {
        setInvestmentError("");
        setIsInvesting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/log-in");
                return;
            }

            // Validate prerequisites
            const checks = validateInvestmentPrerequisites();
            const allPassed = checks.every((c) => c.passed);
            if (!allPassed) {
                setInvestmentError("Please meet all requirements before investing");
                setIsInvesting(false);
                return;
            }

            // Get provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Create contract instance
            console.log("Campaign data:", campaign);
            console.log("Contract address:", campaign.contract_address);

            if (!campaign.contract_address) {
                setInvestmentError("This campaign doesn't have a deployed smart contract yet");
                setIsInvesting(false);
                return;
            }

            const contract = new ethers.Contract(
                campaign.contract_address,
                BusinessCampaignABI.abi,
                signer
            );

            // Convert investment amount to wei
            const amountWei = ethers.parseEther(investmentAmount);

            // Call contribute function
            const tx = await contract.contribute({ value: amountWei });
            const receipt = await tx.wait();

            if (receipt) {
                // Record investment in Supabase
                const recorded = await recordInvestment(
                    user.id,
                    campaign.id,
                    investmentAmount,
                    receipt.hash,
                    walletAddress
                );

                if (recorded) {
                    setInvestmentError("");
                    setInvestmentAmount("");
                    setInvestModal(false);
                    alert("Investment successful! Transaction: " + receipt.hash);
                }
            }
        } catch (error) {
            console.error("Investment error:", error);
            setInvestmentError(error.message || "Investment failed");
        } finally {
            setIsInvesting(false);
        }
    }

    // shafqaat — Monitor network changes
    useEffect(() => {
        if (!window.ethereum) return;

        async function getNetwork() {
            const chainId = await checkNetwork();
            setNetwork(chainId);
        }

        getNetwork();

        window.ethereum.on("chainChanged", () => {
            getNetwork();
        });

        return () => {
            window.ethereum?.removeListener("chainChanged", getNetwork);
        };
    }, []);

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
    const goal = parseFloat(campaign.funding_goal ?? 0).toFixed(4);

    // Display-only: funding progress for the progress bar
    const goalNumber = parseFloat(campaign.funding_goal ?? 0);
    const progress = goalNumber > 0 ? Math.min(100, (raisedAmount / goalNumber) * 100) : 0;
    const isActive = daysLeft > 0;
    const isOnSepolia = network === 11155111;

    // shafqaat — List of all IPFS documents to display as download links
    const documents = [
        { label: "Pitch Deck", url: campaign.pitch_deck_url },
        { label: "Business Plan", url: campaign.business_plan_url },
        { label: "Financial Projections", url: campaign.financials_url },
        { label: "Use of Funds", url: campaign.use_of_funds_url },
        { label: "Product Demo", url: campaign.product_demo_url },
    ].filter((d) => d.url); // shafqaat — only show docs that were uploaded

    // Checklist for the modal (same function, evaluated only while the modal is open)
    const checks = investModal ? validateInvestmentPrerequisites() : [];
    const passedCount = checks.filter((c) => c.passed).length;

    function closeInvestModal() {
        setInvestModal(false);
        setInvestmentError("");
        setInvestmentAmount("");
    }

    const cardClass = "rounded-3xl border border-white/[0.07] bg-[#1a2030]";

    return (
        <div className="min-h-screen bg-[#181A2A] pb-16 pt-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

                {/* shafqaat — Back button */}
                <Link
                    href="/"
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#1a2030] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-[#6f42c1]/40 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All campaigns
                </Link>

                <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-8">

                    {/* ---------- Top-left: cover + title ---------- */}
                    <div className="space-y-6 lg:col-start-1 lg:row-start-1">
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
                    </div>

                    {/* ---------- Top-right: invest card (sticky) ---------- */}
                    <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-24">
                        <div className={`${cardClass} overflow-hidden`}>

                            {/* Raised + progress */}
                            <div className="p-6">
                                <p className="flex items-center gap-1.5 text-sm text-gray-400">
                                    <Coins className="h-4 w-4 text-[#a78bfa]" />
                                    Amount invested
                                </p>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                                    {raisedAmount.toFixed(4)}
                                    <span className="ml-1.5 text-base font-semibold text-gray-400">ETH</span>
                                </p>
                                <p className="mt-1 text-sm text-gray-400">
                                    of {goal} ETH goal
                                </p>

                                <div
                                    className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#0d1117]"
                                    role="progressbar"
                                    aria-valuenow={Math.round(progress)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-[#a78bfa]">
                                    {progress.toFixed(0)}% funded
                                </p>
                            </div>

                            {/* Investment details */}
                            <dl className="mx-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                                <div className="flex items-center justify-between py-3.5">
                                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                                        <Target className="h-4 w-4" /> Funding goal
                                    </dt>
                                    <dd className="text-sm font-semibold text-white">{goal} ETH</dd>
                                </div>
                                <div className="flex items-center justify-between py-3.5">
                                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                                        <Clock className="h-4 w-4" /> Time remaining
                                    </dt>
                                    <dd className={`text-sm font-semibold ${isActive ? "text-white" : "text-red-300"}`}>
                                        {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"}` : "Campaign ended"}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between py-3.5">
                                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                                        <Coins className="h-4 w-4" /> Price per token
                                    </dt>
                                    <dd className="text-sm font-semibold text-[#a78bfa]">
                                        {parseFloat(campaign.price_per_token ?? 0).toFixed(6)} ETH
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between py-3.5">
                                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                                        <Users className="h-4 w-4" /> Investors
                                    </dt>
                                    <dd className="text-sm font-semibold text-white">{investorCount}</dd>
                                </div>
                            </dl>

                            {/* Action */}
                            <div className="p-6 pt-4">
                                {/* shafqaat — Invest button */}
                                <button
                                    onClick={() => {
                                        if (!walletAddress) {
                                            connectWallet();
                                        } else {
                                            setInvestModal(true);
                                        }
                                    }}
                                    disabled={daysLeft === 0}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6f42c1] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#5a3599] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {daysLeft > 0 && <Wallet className="h-4 w-4" />}
                                    {daysLeft > 0 ? (walletAddress ? "Invest now" : "Connect wallet") : "Campaign ended"}
                                </button>

                                <p className="mt-3 text-center text-xs text-gray-500">
                                    MetaMask required to invest
                                </p>

                                {/* shafqaat — Network status indicator */}
                                {walletAddress && (
                                    <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
                                        isOnSepolia ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                                    }`}>
                                        <Network className="h-3.5 w-3.5" />
                                        {isOnSepolia ? "Sepolia network" : "Wrong network"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* ---------- Left column: assessment first, then story ---------- */}
                    <div className="space-y-6 lg:col-start-1 lg:row-start-2">

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

            {/* shafqaat — Investment Modal */}
            {investModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Invest in ${campaign.title}`}
                >
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#1a2030] p-6 sm:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-white">Invest in {campaign.title}</h2>
                                <p className="mt-1 text-sm text-gray-400">
                                    Confirm the requirements, then enter your amount.
                                </p>
                            </div>
                            <button
                                onClick={closeInvestModal}
                                aria-label="Close"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* shafqaat — Prerequisites checklist */}
                        <div className="mb-6">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-white">Investment requirements</p>
                                <span className="text-xs text-gray-400">{passedCount} of {checks.length} met</span>
                            </div>
                            <div className="space-y-2">
                                {checks.map((check) => (
                                    <div key={check.label} className="flex items-center gap-3 rounded-xl bg-[#0d1117] px-3.5 py-2.5">
                                        {check.passed ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                                        )}
                                        <span className={`text-xs ${check.passed ? "text-green-400" : "text-red-400"}`}>
                                            {check.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* shafqaat — Network warning */}
                        {walletAddress && network !== 11155111 && (
                            <div className="mb-6 flex gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3.5">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                                <p className="text-xs text-yellow-200">
                                    You&apos;re on the wrong network. Please switch to Sepolia testnet.
                                </p>
                            </div>
                        )}

                        {/* shafqaat — Error message */}
                        {investmentError && (
                            <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                                <p className="text-xs text-red-200">{investmentError}</p>
                            </div>
                        )}

                        {/* shafqaat — Investment amount input */}
                        {walletAddress && (
                            <div className="mb-6">
                                <label htmlFor="invest-amount" className="mb-2 block text-sm font-semibold text-white">
                                    Investment amount
                                </label>
                                <div className="relative">
                                    <input
                                        id="invest-amount"
                                        type="number"
                                        placeholder="0.1"
                                        value={investmentAmount}
                                        onChange={(e) => setInvestmentAmount(e.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-[#0d1117] py-3 pl-4 pr-16 text-white placeholder-gray-600 focus:border-[#6f42c1] focus:outline-none"
                                    />
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                                        ETH
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Price per token: {parseFloat(campaign.price_per_token ?? 0).toFixed(6)} ETH
                                </p>
                            </div>
                        )}

                        {/* shafqaat — Action buttons */}
                        {!walletAddress ? (
                            <button
                                onClick={connectWallet}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6f42c1] px-4 py-3.5 font-bold text-white transition hover:bg-[#5a3599]"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect MetaMask
                            </button>
                        ) : (
                            <>
                                {network !== 11155111 && (
                                    <button
                                        onClick={switchToSepolia}
                                        className="mb-3 w-full rounded-2xl bg-yellow-600 px-4 py-3.5 font-bold text-white transition hover:bg-yellow-700"
                                    >
                                        Switch to Sepolia
                                    </button>
                                )}
                                <button
                                    onClick={investInCampaign}
                                    disabled={isInvesting || !investmentAmount}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6f42c1] px-4 py-3.5 font-bold text-white transition hover:bg-[#5a3599] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isInvesting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        "Confirm investment"
                                    )}
                                </button>
                            </>
                        )}

                        <button
                            onClick={closeInvestModal}
                            className="mt-3 w-full rounded-2xl bg-[#0d1117] px-4 py-3.5 font-semibold text-gray-300 transition hover:bg-white/5"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
