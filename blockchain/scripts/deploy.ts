import { ethers } from "hardhat";

async function main() {
  console.log("Deploying CampaignFactory...");

  // 1. Get the contract factory
  // Make sure "CampaignFactory" matches the name inside your .sol file exactly
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