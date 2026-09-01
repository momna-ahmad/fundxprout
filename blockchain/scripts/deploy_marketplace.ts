import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  // Define constructor arguments:
  // 1. Fee Treasury Address (receives platform fees)
  // 2. KYC Signer Address (validates Didit/backend KYC signatures)
  const feeTreasuryAddress = process.env.FEE_TREASURY_ADDRESS ;
  const kycSignerAddress = process.env.FEE_TREASURY_ADDRESS ;

  console.log(`Fee Treasury: ${feeTreasuryAddress}`);
  console.log(`KYC Signer:   ${kycSignerAddress}`);

  // Get Contract Factory & Deploy
  const MarketplaceFactory = await ethers.getContractFactory("EquitySecondaryMarketplace");
  const marketplace = await MarketplaceFactory.deploy(feeTreasuryAddress!, kycSignerAddress!);

  await marketplace.waitForDeployment();

  const contractAddress = await marketplace.getAddress();
  console.log(`✅ EquitySecondaryMarketplace deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});