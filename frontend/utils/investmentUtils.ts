// Investment utility functions
import { createClient } from "@/utils/supabase/client";
import { ethers } from "ethers";

// Check if user is on Sepolia testnet (chainId: 11155111)
export const checkNetwork = async () => {
  if (!window.ethereum) return null;
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const { chainId } = await provider.getNetwork();
    return Number(chainId);
  } catch (err) {
    console.error("Error checking network:", err);
    return null;
  }
};

// Switch to Sepolia network
export const switchToSepolia = async () => {
  if (!window.ethereum) return false;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }], // 11155111 in hex
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      // Network not added, try to add it
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "ETH",
                decimals: 18,
              },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Sepolia network:", addError);
        return false;
      }
    }
    console.error("Error switching network:", error);
    return false;
  }
};

// Record investment in Supabase
export const recordInvestment = async (
  userId: string,
  campaignId: string,
  amount: string,
  txHash: string,
  investorAddress: string,
  pricePerToken?: string      // ✅ add this param
) => {
  try {
    const supabase = createClient();

    // Calculate equity tokens received
    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(pricePerToken ?? "0");
    const equityTokens = priceNum > 0 ? amountNum / priceNum : 0;

    const { error } = await supabase.from("investments").insert([{
      investor_id:               userId,
      campaign_id:               parseInt(campaignId),
      amount:                    amountNum,
      equity_tokens:             equityTokens,
      token_price_at_investment: priceNum,
      tokens_available:          equityTokens,   // starts fully available to trade
      tokens_traded:             0,
      transaction_hash:          txHash,
      investor_address:          investorAddress,
      invested_at:               new Date().toISOString(),
      status:                    "completed",
    }]);

    if (error) {
      console.error("Error recording investment:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception recording investment:", err);
    return false;
  }
};

// Fetch investment history for a user
export const fetchInvestmentHistory = async (userId: string) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("investor_id", userId)
      .order("invested_at", { ascending: false });

    if (error) {
      console.error("Error fetching investment history:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception fetching investment history:", err);
    return [];
  }
};

// Get total invested amount by user
export const getTotalInvestedAmount = async (userId: string) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investments")
      .select("amount")
      .eq("investor_id", userId)
      .eq("status", "completed");

    if (error) {
      console.error("Error calculating total invested:", error);
      return 0;
    }

    const total = (data || []).reduce(
      (sum, inv) => sum + (parseFloat(inv.amount) || 0),
      0
    );
    return total;
  } catch (err) {
    console.error("Exception calculating total invested:", err);
    return 0;
  }
};

// Get investments by campaign
export const getInvestmentsByCampaign = async (campaignId: string) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "completed")
      .order("invested_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaign investments:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception fetching campaign investments:", err);
    return [];
  }
};

// Get total raised for a campaign
export const getTotalRaisedForCampaign = async (campaignId: string) => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investments")
      .select("amount")
      .eq("campaign_id", campaignId)
      .eq("status", "completed");

    if (error) {
      console.error("Error calculating campaign total:", error);
      return 0;
    }

    const total = (data || []).reduce(
      (sum, inv) => sum + (parseFloat(inv.amount) || 0),
      0
    );
    return total;
  } catch (err) {
    console.error("Exception calculating campaign total:", err);
    return 0;
  }
};
