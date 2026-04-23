"use client";
// shafqaat — Campaign detail page for investor view
// Route: /campaigns/[id]  — id is the Supabase campaign UUID
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import { createClient } from "@/utils/supabase/client";
import {
    Loader2, ExternalLink, FileText, Calendar, Target,
    ArrowLeft, Clock, X, AlertCircle, CheckCircle2, Wallet, Network
} from "lucide-react";
import { ethers } from "ethers";
import BusinessCampaignABI from "@/abis/BusinessCampaign.json";
import {
    checkNetwork,
    switchToSepolia,
    recordInvestment,
    getInvestmentsByCampaign,
} from "@/utils/investmentUtils";

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
                BusinessCampaignABI,
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
    const pledgedAmount = parseFloat(campaign.amount_pledged ?? raisedAmount ?? 0);
    const totalInvestors = Number(campaign.investor_count ?? investorCount ?? 0);

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
                    href="/"
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
                            <span className="text-xs font-semibold text-[#a78bfa] uppercase tracking-widest">
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

                                {/* shafqaat — Campaign funding stats */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Amount Pledged</p>
                                    <p className="text-sm font-semibold text-white">
                                        {pledgedAmount.toFixed(4)} ETH
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Investor Count</p>
                                    <p className="text-sm font-semibold text-white">
                                        {totalInvestors}
                                    </p>
                                </div>
                            </div>

                            {/* shafqaat — Invest button (wiring to blockchain comes in Week 5) */}
                            <button
                                onClick={() => {
                                    if (!walletAddress) {
                                        connectWallet();
                                    } else {
                                        setInvestModal(true);
                                    }
                                }}
                                disabled={daysLeft === 0}
                                className="w-full bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition text-sm"
                            >
                                {daysLeft > 0 ? (walletAddress ? "Invest Now" : "Connect Wallet") : "Campaign Ended"}
                            </button>

                            <p className="text-xs text-gray-600 text-center mt-3">
                                MetaMask required to invest
                            </p>

                            {/* shafqaat — Network status indicator */}
                            {walletAddress && (
                                <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                                    network === 11155111 ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                                }`}>
                                    <Network className="h-3 w-3" />
                                    {network === 11155111 ? "Sepolia Network" : "Wrong Network"}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* shafqaat — Investment Modal */}
            {investModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a2030] rounded-2xl border border-white/10 p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Invest in {campaign.title}</h2>
                            <button
                                onClick={() => {
                                    setInvestModal(false);
                                    setInvestmentError("");
                                    setInvestmentAmount("");
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* shafqaat — Prerequisites checklist */}
                        <div className="mb-6 space-y-3">
                            <p className="text-xs text-gray-400 font-semibold uppercase">Investment Requirements</p>
                            {validateInvestmentPrerequisites().map((check) => (
                                <div key={check.label} className="flex items-center gap-3 p-2 rounded bg-[#0d1117]">
                                    {check.passed ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                                    )}
                                    <span className={`text-xs ${check.passed ? "text-green-400" : "text-red-400"}`}>
                                        {check.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* shafqaat — Network warning */}
                        {walletAddress && network !== 11155111 && (
                            <div className="mb-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex gap-3">
                                <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-200">
                                    You're on the wrong network. Please switch to Sepolia testnet.
                                </p>
                            </div>
                        )}

                        {/* shafqaat — Error message */}
                        {investmentError && (
                            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3">
                                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-200">{investmentError}</p>
                            </div>
                        )}

                        {/* shafqaat — Investment amount input */}
                        {walletAddress && (
                            <div className="mb-6 space-y-2">
                                <label className="text-xs text-gray-400 font-semibold uppercase">
                                    Investment Amount (ETH)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0.1"
                                    value={investmentAmount}
                                    onChange={(e) => setInvestmentAmount(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#6f42c1]"
                                />
                                <p className="text-xs text-gray-500">
                                    Price per token: {parseFloat(campaign.price_per_token ?? 0).toFixed(6)} ETH
                                </p>
                            </div>
                        )}

                        {/* shafqaat — Action buttons */}
                        {!walletAddress ? (
                            <button
                                onClick={connectWallet}
                                className="w-full bg-[#6f42c1] hover:bg-[#5a3599] text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect MetaMask
                            </button>
                        ) : (
                            <>
                                {network !== 11155111 && (
                                    <button
                                        onClick={switchToSepolia}
                                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition mb-3"
                                    >
                                        Switch to Sepolia
                                    </button>
                                )}
                                <button
                                    onClick={investInCampaign}
                                    disabled={isInvesting || !investmentAmount}
                                    className="w-full bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                >
                                    {isInvesting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        "Confirm Investment"
                                    )}
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => {
                                setInvestModal(false);
                                setInvestmentError("");
                                setInvestmentAmount("");
                            }}
                            className="w-full mt-3 bg-[#0d1117] hover:bg-[#1a2030] text-gray-300 font-semibold py-3 px-4 rounded-lg transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
