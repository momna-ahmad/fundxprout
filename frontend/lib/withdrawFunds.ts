import { ethers } from "ethers";
import BusinessCampaignJSON from "@/abis/BusinessCampaign.json";

// Function to invoke withdrawFunds on the specific campaign contract
async function handleWithdrawFunds(contractAddress : string, setTxPending : (address: string | null) => void) {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    setTxPending(contractAddress); // Set loading state for this specific card
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Attach to the specific campaign contract address fetched from Supabase
    const campaignContract = new ethers.Contract(
      contractAddress,
      BusinessCampaignJSON.abi,
      signer
    );

    // Trigger the withdrawFunds() method on BusinessCampaign.sol
    const tx = await campaignContract.withdrawFunds();
    alert("Withdrawal transaction submitted! Hash: " + tx.hash);

    await tx.wait();
    alert("Funds successfully withdrawn to your wallet!");
    window.location.reload(); // Refresh UI to update balances
  } catch (err : any) {
    console.error("Withdrawal error:", err);
    alert(err.reason || err.message || "Withdrawal failed");
  } finally {
    setTxPending(null);
  }
}