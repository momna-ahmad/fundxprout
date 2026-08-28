import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=====================================");
  console.log("🔍 DEBUG INFO");
  console.log("Hardhat is using this account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  console.log("Hardhat is connected to chain ID:", network.chainId);
  console.log("=====================================");

  const feeTreasury = process.env.FEE_TREASURY_ADDRESS;
  if (!feeTreasury) {
    throw new Error("FEE_TREASURY_ADDRESS must be set in env");
  }

  console.log("Deploying EquitySecondaryMarketplace...");

  const Marketplace = await ethers.getContractFactory("EquitySecondaryMarketplace");
  const marketplace = await Marketplace.deploy(feeTreasury);

  await marketplace.waitForDeployment();
  console.log("EquitySecondaryMarketplace deployed to:", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
