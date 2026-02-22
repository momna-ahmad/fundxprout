import { ethers } from "hardhat";

async function main() {
  // --- DIAGNOSTIC LOGS ---
  const [deployer] = await ethers.getSigners();
  console.log("=====================================");
  console.log("🔍 DEBUG INFO");
  console.log("Hardhat is using this account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log("Hardhat is connected to chain ID:", network.chainId);
  console.log("=====================================\n");
  // -----------------------

  console.log("Deploying CampaignFactory...");

  // 1. Get the contract factory
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");

  // 2. Deploy the contract
  const campaignFactory = await CampaignFactory.deploy();

  // 3. Wait for the deployment transaction to finish
  await campaignFactory.waitForDeployment();

  // 4. Get the deployed address
  const address = await campaignFactory.getAddress();

  console.log("CampaignFactory deployed to:", address);
}

// This pattern handles errors and exit codes
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
