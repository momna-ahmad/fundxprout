import { ethers } from "ethers";
import { saveCampaignToDb } from "./action"; // Import the server action
import CampaignFactoryJSON from "@/abis/CampaignFactory.json";

// The address you just got from your Hardhat deployment
const CONTRACT_ADDRESS = "0xf8545D3957d84506AA713f3B760570fB1E6D19F6";

export async function launchBusinessCampaign(
  prevState: any, // Needed for useActionState
  formData: FormData,
) {
  console.log("launch cmapign function");
  // 1. Extract Data from FormData
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const goal = formData.get("goal") as string; // in ETH
  const duration = parseInt(formData.get("duration") as string);
  const category = formData.get("category") as string;
  const imageUrl = (formData.get("image_url") as string) ?? "";

  // 2. Logic: Price per token is Goal / 1000
  const goalNum = parseFloat(goal);
  const pricePerTokenNum = goalNum / 1000;

  // Convert to Wei for Smart Contract
  const goalInWei = ethers.parseEther(goal);
  const priceInWei = ethers.parseEther(pricePerTokenNum.toString());

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

    // If you expect Sepolia, Chain ID should be 11155111
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
      goalInWei,
      duration,
      priceInWei,
      {
        // Adding a manual gas limit bypasses the "0 ETH" estimation bug
        gasLimit: 3000000,
      },
    );

    const receipt = await transaction.wait();
    console.log("Blockchain Success:", receipt.hash);

    // 4. Save to Supabase via Server Action
    const dbResult = await saveCampaignToDb({
      title,
      description,
      goal,
      duration,
      category,
      txHash: receipt.hash,
      pricePerToken: pricePerTokenNum.toString(),
      imageUrl,
    });

    if (dbResult.error) return { error: dbResult.error };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Transaction failed" };
  }
}
