"use client";
// Investor Dashboard: Browse campaigns, track investments, view portfolio
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Plus,
  Eye,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  PieChart,
  TrendingDown,
  Star,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getAllCampaigns } from "@/utils/supabase/getCampaigns";
import {
  getMyProfile,
  calcProfileCompletion,
} from "@/utils/supabase/getProfile";
import { ethers } from "ethers";
import BusinessCampaignABI from "@/abis/BusinessCampaign.json";

import MarketAnalytics from "@/components/market-analytics";
import {
  checkNetwork,
  switchToSepolia,
  recordInvestment,
  fetchInvestmentHistory as fetchHistoryUtil,
  getTotalInvestedAmount,
} from "@/utils/investmentUtils";
import Navbar from "@/components/navbar";
import RiskBadge from "@/components/RiskBadge";

const ITEMS_PER_PAGE = 9; // campaigns per page in Browse Campaigns tab

// Calculate days left from created_at + duration
function calcDaysLeft(createdAt, durationDays) {
  const deadline = new Date(
    new Date(createdAt).getTime() + (durationDays ?? 30) * 24 * 60 * 60 * 1000,
  );
  const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function InvestorDashboardPage() {
  const router = useRouter();
  // Active tab state
  const [activeTab, setActiveTab] = useState("browse");

  // Real data from Supabase
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Browse Campaigns tab: search + pagination + category filter
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Wallet and investment state
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [investModal, setInvestModal] = useState({
    open: false,
    campaign: null,
  });
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [isInvesting, setIsInvesting] = useState(false);
  const [network, setNetwork] = useState(null);
  const [investmentHistory, setInvestmentHistory] = useState([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [investmentError, setInvestmentError] = useState(null);

  // Fetch user, campaigns and profile in parallel on mount
  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Test Supabase connection
        console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          console.warn("No authenticated user:", authError);
        }
        setUser(authUser);
        setDebugInfo((prev) => ({
          ...prev,
          authUser: authUser?.email || "Not authenticated",
        }));

        console.log("Fetching campaigns from Supabase...");
        const camps = await getAllCampaigns();
        console.log("First campaign keys:", Object.keys(camps[0] || {}));
        console.log("contract_address value:", camps[0]?.contract_address);
        console.log("getAllCampaigns returned:", camps);

        const prof = await getMyProfile();
        console.log("getMyProfile returned:", prof);

        setCampaigns(camps || []);
        setProfile(prof);
        setLoadError(null);
        setDebugInfo((prev) => ({
          ...prev,
          campaignsCount: camps?.length || 0,
          hasProfile: !!prof,
        }));
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setLoadError(err.message || "Unknown error loading campaigns");
        setDebugInfo((prev) => ({ ...prev, error: err.message }));
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // Compute real stats from the fetched campaigns
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(
      (c) => calcDaysLeft(c.created_at, c.duration) > 0,
    ).length,
    totalFundingGoal: campaigns.reduce(
      (s, c) => s + parseFloat(c.funding_goal ?? "0"),
      0,
    ),
    profileCompletion: calcProfileCompletion(profile),
  };

  // Filtered + paginated campaigns for Browse Campaigns tab
  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || c.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Debug logging
  useEffect(() => {
    console.log("Dashboard state:", {
      loading,
      campaignsCount: campaigns.length,
      filteredCount: filtered.length,
      paginatedCount: paginated.length,
      totalPages,
      currentPage,
    });
  }, [campaigns, filtered, paginated, loading, totalPages, currentPage]);

  // Get unique categories
  const categories = [
    "all",
    ...new Set(campaigns.map((c) => c.category).filter(Boolean)),
  ];

  // Check network on mount and when wallet changes
  useEffect(() => {
    if (walletAddress) {
      checkNetwork().then((chainId) => {
        setNetwork(chainId);
      });

      // Listen for network changes
      const handleChainChanged = () => {
        checkNetwork().then((chainId) => {
          setNetwork(chainId);
        });
      };

      window.ethereum?.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [walletAddress]);

  // Fetch investment history on mount
  useEffect(() => {
    if (user) {
      fetchHistoryUtil(user.id).then((history) => {
        setInvestmentHistory(history);
      });

      getTotalInvestedAmount(user.id).then((total) => {
        setTotalInvested(total);
      });
    }
  }, [user]);

  // Connect to MetaMask
  const connectWallet = async () => {
    // Check if user is logged in
    if (!user) {
      alert("Please log in first before connecting your wallet");
      return;
    }

    if (!window.ethereum) {
      alert("Please install MetaMask to invest in campaigns");
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);

      // Check current network
      const chainId = await checkNetwork();
      setNetwork(chainId);

      // If not on Sepolia, prompt to switch
      if (chainId !== 11155111) {
        const switched = await switchToSepolia();
        if (switched) {
          setNetwork(11155111);
          alert("Successfully switched to Sepolia testnet");
        } else {
          alert("Please manually switch to Sepolia testnet in MetaMask");
        }
      }

      alert(
        `Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      );
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setWalletAddress(null);
    router.push("/");
  };

  // Validate investment prerequisites
  const validateInvestmentPrerequisites = () => {
    setInvestmentError(null);

    // Check authentication
    if (!user) {
      setInvestmentError("Please log in to invest in campaigns");
      return false;
    }

    // Check wallet connection
    if (!walletAddress) {
      setInvestmentError("Please connect MetaMask first");
      return false;
    }

    // Check network
    if (network !== 11155111) {
      setInvestmentError("Please switch to Sepolia testnet");
      return false;
    }

    // Check investment amount
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      setInvestmentError("Please enter a valid investment amount");
      return false;
    }

    // Check campaign has contract address
    if (!investModal.campaign?.contract_address) {
      setInvestmentError("This campaign is not yet deployed on blockchain");
      return false;
    }

    // Check campaign is still active
    if (
      calcDaysLeft(
        investModal.campaign.created_at,
        investModal.campaign.duration,
      ) <= 0
    ) {
      setInvestmentError("This campaign has ended");
      return false;
    }

    return true;
  };

  // Invest in a campaign
  const investInCampaign = async () => {
    if (!validateInvestmentPrerequisites()) return;

    try {
      setIsInvesting(true);
      setInvestmentError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const contract = new ethers.Contract(
        investModal.campaign.contract_address,
        BusinessCampaignABI,
        signer,
      );

      alert("Please confirm the transaction in MetaMask...");

      const tx = await contract.contribute({
        value: ethers.parseEther(investmentAmount),
      });

      alert("Transaction pending... Transaction hash: " + tx.hash);

      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        // Record investment in Supabase
        const recorded = await recordInvestment(
          user.id,
          investModal.campaign.id,
          investmentAmount,
          tx.hash,
          signerAddress,
          investModal.campaign.price_per_token, // ✅ add this
        );

        if (recorded) {
          alert("Investment successful! Your transaction has been recorded.");

          // Refresh data
          setInvestModal({ open: false, campaign: null });
          setInvestmentAmount("");

          const updatedCampaigns = await getAllCampaigns();
          setCampaigns(updatedCampaigns);

          // Fetch investment history
          const history = await fetchHistoryUtil(user.id);
          setInvestmentHistory(history);

          // Update total invested
          const total = await getTotalInvestedAmount(user.id);
          setTotalInvested(total);
        } else {
          alert(
            "Investment recorded on blockchain but failed to save in database.\\nPlease contact support with tx hash: " +
              tx.hash,
          );
        }
      } else {
        setInvestmentError("Transaction failed. Please try again.");
        alert("Transaction failed. Please try again.");
      }
    } catch (error) {
      console.error("Investment failed:", error);

      let errorMsg = error.message;
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "Transaction rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMsg = "Insufficient ETH balance for this investment";
      } else if (error.message.includes("network")) {
        errorMsg = "Network error. Please check your connection and try again.";
      }

      setInvestmentError("Investment failed: " + errorMsg);
      alert("Investment failed: " + errorMsg);
    } finally {
      setIsInvesting(false);
    }
  };

  const tabs = [
    { id: "browse", label: "Browse Campaigns", icon: Target },
    { id: "portfolio", label: "My Portfolio", icon: PieChart },
    { id: "analytics", label: "Market Analytics", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: UserCircle },
  ];

  // Derive display name from user or profile
  const displayName = profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Investor';

  return (
    <div className="min-h-screen bg-[#181A2A]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Dashboard header with real user name */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              {loading ? "Dashboard" : `Welcome, ${displayName}`}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Discover opportunities and track your investments
            </p>
          </div>

          <div className="flex items-center space-x-4 items-end">
            {/* Network Status */}
            <div className="bg-[#1a2030] border border-white/5 rounded-xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${network === 11155111 ? "bg-green-500" : network ? "bg-red-500" : "bg-gray-500"}`}
                />
                {network === 11155111 ? (
                  <span className="text-xs text-green-400 font-medium">
                    Sepolia ✓
                  </span>
                ) : network ? (
                  <span className="text-xs text-red-400 font-medium">
                    Wrong Network
                  </span>
                ) : walletAddress ? (
                  <span className="text-xs text-gray-400 font-medium">
                    Checking...
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Wallet Status */}
            <div className="bg-[#1a2030] border border-white/5 rounded-xl px-4 py-2">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-[#6f42c1]" />
                {walletAddress ? (
                  <span className="text-white text-sm font-medium">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting || !user}
                    className="text-[#6f42c1] text-sm font-medium hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !user
                        ? "Please log in first"
                        : "Click to connect MetaMask"
                    }
                  >
                    {!user
                      ? "Log in First"
                      : isConnecting
                        ? "Connecting..."
                        : "Connect"}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-4 py-2 rounded-xl font-semibold transition duration-200 flex items-center gap-2 text-sm border border-[#6f42c1] hover:border-[#5a3599]"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-[#1a2030] p-1 rounded-xl border border-white/5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[#6f42c1] text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "browse" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Campaigns</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.totalCampaigns}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-[#6f42c1]" />
                </div>
              </div>

              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Campaigns</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.activeCampaigns}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Funding Goal</p>
                    <p className="text-2xl font-bold text-white">
                      ${stats.totalFundingGoal.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Profile Completion</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.profileCompletion}%
                    </p>
                  </div>
                  <UserCircle className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a2030] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-[#1a2030] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">Loading campaigns...</p>
              </div>
            )}

            {/* Error State */}
            {loadError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center space-y-3">
                <p className="text-red-400 font-medium">
                  Error loading campaigns
                </p>
                <p className="text-red-300 text-sm">{loadError}</p>
                {debugInfo && (
                  <details className="text-left mt-4">
                    <summary className="text-xs text-red-300 cursor-pointer mb-2">
                      Debug Info
                    </summary>
                    <pre className="bg-black/30 p-2 rounded text-xs text-red-200 overflow-auto max-h-40">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && campaigns.length === 0 && !loadError && (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">
                  No campaigns available yet
                </p>
              </div>
            )}

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-[#1a2030] border border-white/5 rounded-xl overflow-hidden hover:border-[#6f42c1]/50 transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#6f42c1] to-[#5a3599] relative">
                    {campaign.image_url && (
                      <img
                        src={campaign.image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <RiskBadge score={campaign.risk_score} />
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          calcDaysLeft(campaign.created_at, campaign.duration) >
                          0
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {calcDaysLeft(campaign.created_at, campaign.duration) >
                        0
                          ? "Active"
                          : "Ended"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white line-clamp-2">
                        {campaign.title}
                      </h3>
                      <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full ml-2">
                        {campaign.category}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {campaign.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Funding Goal</span>
                        <span className="text-white font-medium">
                          $
                          {parseFloat(
                            campaign.funding_goal || 0,
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Days Left</span>
                        <span className="text-white font-medium">
                          {calcDaysLeft(campaign.created_at, campaign.duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] text-white font-medium py-2 px-4 rounded-lg transition-colors text-center block"
                      >
                        View Campaign
                      </Link>
                      <button
                        onClick={() => setInvestModal({ open: true, campaign })}
                        disabled={
                          !walletAddress ||
                          calcDaysLeft(
                            campaign.created_at,
                            campaign.duration,
                          ) <= 0 ||
                          !campaign.contract_address
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Invest
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-[#1a2030] border border-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        currentPage === page
                          ? "bg-[#6f42c1] text-white"
                          : "bg-[#1a2030] border border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-[#1a2030] border border-white/5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Total Invested</p>
                <p className="text-3xl font-bold text-white">
                  ${totalInvested.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Investments</p>
                <p className="text-3xl font-bold text-white">
                  {investmentHistory.length}
                </p>
              </div>
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Average Investment</p>
                <p className="text-3xl font-bold text-white">
                  {investmentHistory.length > 0
                    ? `$${(totalInvested / investmentHistory.length).toFixed(2)}`
                    : "$0"}
                </p>
              </div>
            </div>

            {/* Investment History */}
            {investmentHistory.length > 0 ? (
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Investment History
                </h3>
                <div className="space-y-4">
                  {investmentHistory.map((inv, idx) => (
                    <div
                      key={inv.id || idx}
                      className="border border-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium">
                          Campaign ID: {inv.campaign_id}
                        </p>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          {inv.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="text-white font-medium">
                            ${parseFloat(inv.amount).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="text-white font-medium">
                            {new Date(inv.invested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-gray-500 text-xs mb-1">
                          Transaction Hash
                        </p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${inv.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6f42c1] text-xs hover:underline break-all"
                        >
                          {inv.transaction_hash.slice(0, 20)}...
                          {inv.transaction_hash.slice(-20)}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#1a2030] border border-white/5 rounded-xl p-8 text-center">
                <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  No Investments Yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Start investing in campaigns to build your portfolio
                </p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="bg-[#6f42c1] hover:bg-[#5a3599] text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Browse Campaigns
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-[#1a2030] border border-white/5 rounded-xl p-8 text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Market Analytics
              </h3>
              <p className="text-gray-400 mb-6">
                Market trends, sector performance, and investment insights
              </p>
              <p className="text-sm text-gray-500">
                Coming soon - Market analysis and investment trends
              </p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-[#1a2030] border border-white/5 rounded-xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <UserCircle className="w-12 h-12 text-[#6f42c1]" />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Investor Profile
                  </h3>
                  <p className="text-gray-400">
                    Manage your investor profile and preferences
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Completion
                  </label>
                  <div className="w-full bg-[#0d1117] rounded-full h-2">
                    <div
                      className="bg-[#6f42c1] h-2 rounded-full transition-all"
                      style={{ width: `${stats.profileCompletion}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {stats.profileCompletion}% complete
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <Link
                    href="/profile"
                    className="bg-[#6f42c1] hover:bg-[#5a3599] text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Complete Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Investment Modal */}
      {investModal.open && investModal.campaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2030] border border-white/5 rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              Invest in {investModal.campaign.title}
            </h3>

            {/* Prerequisites Checklist */}
            <div className="bg-[#0d1117] rounded-lg p-4 mb-4 text-sm space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${user ? "bg-green-500" : "bg-red-500"}`}
                >
                  {user ? "✓" : "✗"}
                </div>
                <span className={user ? "text-green-400" : "text-red-400"}>
                  Logged In
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${walletAddress ? "bg-green-500" : "bg-red-500"}`}
                >
                  {walletAddress ? "✓" : "✗"}
                </div>
                <span
                  className={walletAddress ? "text-green-400" : "text-red-400"}
                >
                  Wallet Connected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${network === 11155111 ? "bg-green-500" : "bg-yellow-500"}`}
                >
                  {network === 11155111 ? "✓" : "!"}
                </div>
                <span
                  className={
                    network === 11155111 ? "text-green-400" : "text-yellow-400"
                  }
                >
                  {network === 11155111
                    ? "Sepolia Network"
                    : "Switch to Sepolia"}
                </span>
              </div>
            </div>

            {/* Investment Details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  placeholder="0.1"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent"
                />
              </div>

              <div className="text-sm text-gray-400">
                <p className="flex justify-between mb-1">
                  <span>Funding Goal:</span>
                  <span className="text-white">
                    {investModal.campaign.funding_goal} ETH
                  </span>
                </p>
                <p className="flex justify-between mb-1">
                  <span>Days Left:</span>
                  <span className="text-white">
                    {calcDaysLeft(
                      investModal.campaign.created_at,
                      investModal.campaign.duration,
                    )}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Status:</span>
                  <span
                    className={
                      calcDaysLeft(
                        investModal.campaign.created_at,
                        investModal.campaign.duration,
                      ) > 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {calcDaysLeft(
                      investModal.campaign.created_at,
                      investModal.campaign.duration,
                    ) > 0
                      ? "Active"
                      : "Ended"}
                  </span>
                </p>
              </div>

              {/* Network Warning */}
              {network && network !== 11155111 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">
                    Please switch to Sepolia testnet before investing
                  </p>
                </div>
              )}

              {/* Error Message */}
              {investmentError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{investmentError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setInvestModal({ open: false, campaign: null });
                  setInvestmentError(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={investInCampaign}
                disabled={
                  !investmentAmount ||
                  parseFloat(investmentAmount) <= 0 ||
                  isInvesting
                }
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isInvesting ? "Investing..." : "Confirm Investment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
