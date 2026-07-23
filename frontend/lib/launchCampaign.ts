// frontend/lib/launchCampaign.ts
import { ethers } from "ethers";
import { saveCampaignToDb } from "./action";
import CampaignFactoryJSON from "@/abis/CampaignFactory.json";

// ⚠️ Hafsa has Updated this after redeploying CampaignFactory with the new event
//const CONTRACT_ADDRESS = "0x2FCA6AF6d0C9FF4a129fEF46bD4bc4eA2A0B25d0";

//redeployed after erc 20 smart contract (18-7-2026)
const CONTRACT_ADDRESS = "0x876daC31839C7aeD4fa742da1D10B4902099c673" ;

export async function launchBusinessCampaign(
  prevState: any,
  formData: FormData,
) {
  console.log("launch campaign function");

  // 1. Extract Data from FormData
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const goal = formData.get("goal") as string;
  const duration = parseInt(formData.get("duration") as string);
  const category = formData.get("category") as string;
  const tokenSymbol = formData.get("tokenSymbol") as string; 
  const pricePerToken = formData.get("pricePerToken") as string;

  const imageUrl = (formData.get("image_url") as string) ?? "";
  const pitchDeckCid = (formData.get("pitch_deck_cid") as string) ?? "";
  const businessPlanCid = (formData.get("business_plan_cid") as string) ?? "";
  const financialsCid = (formData.get("financials_cid") as string) ?? "";
  const useOfFundsCid = (formData.get("use_of_funds_cid") as string) ?? "";
  const productDemoCid = (formData.get("product_demo_cid") as string) ?? "";

  const goalInWei = ethers.parseEther(goal);
  const priceInWei = ethers.parseEther(pricePerToken.toString());

  if (typeof window === "undefined" || !window.ethereum) {
    return { error: "Please install MetaMask!" };
  }

  try {
    // 3. Blockchain Transaction
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const network = await provider.getNetwork();
    console.log("Connected to Chain ID:", network.chainId);

    if (network.chainId !== BigInt(11155111)) {
      alert("Please switch MetaMask to the Sepolia Testnet!");
      return;
    }

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CampaignFactoryJSON.abi,
      signer,
    );

    const transaction = await contract.createCampaign(
      title,
      tokenSymbol,
      goalInWei,
      duration,
      priceInWei,
      { gasLimit: 3000000 },
    );

    const receipt = await transaction.wait();
    console.log("Blockchain Success:", receipt.hash);

    // ✅ NEW: Parse the CampaignCreated event to get the deployed contract address
    let campaignContractAddress: string | null = null;
    let tokenContractAddress: string | null = null;

    const iface = new ethers.Interface(CampaignFactoryJSON.abi);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "CampaignCreated") {
          campaignContractAddress = parsed.args.campaignAddress;
          tokenContractAddress = parsed.args.tokenAddress;
          console.log("Deployed campaign contract address:", campaignContractAddress);
          console.log("Deployed token contract address:", tokenContractAddress);
          break;
        }
      } catch {
        // This log didn't match the ABI, skip it
      }
    }

    if (!campaignContractAddress || !tokenContractAddress) {
      console.error("CampaignCreated event not found in logs:", receipt.logs);
      return { error: "Campaign deployed on blockchain but contract address could not be extracted. Contact support with tx hash: " + receipt.hash };
    }

    // 4. Save to Supabase — now includes contractAddress
    const dbResult = await saveCampaignToDb({
      title,
      tokenSymbol,
      description,
      goal,
      duration,
      category,
      txHash: receipt.hash,
      contractAddress: campaignContractAddress, 
      tokenContractAddress,
      pricePerToken,
      imageUrl,
      pitchDeckCid,
      businessPlanCid,
      financialsCid,
      useOfFundsCid,
      productDemoCid,
    });

    if (dbResult.error) return { error: dbResult.error };

    return { success: true };

  } catch (error: any) {
    return { error: error.message || "Transaction failed" };
  }
}