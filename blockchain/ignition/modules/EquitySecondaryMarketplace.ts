import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EquitySecondaryMarketplaceModule = buildModule("EquitySecondaryMarketplaceModule", (m) => {
  const feeTreasury = process.env.FEE_TREASURY_ADDRESS || "";
  const kycSignerAddress = process.env.KYC_SIGNER_ADDRESS || "";

  if (!feeTreasury || !kycSignerAddress) {
    throw new Error("Environment variables FEE_TREASURY_ADDRESS and KYC_SIGNER_ADDRESS must be set.");
  }

  const marketplace = m.contract("EquitySecondaryMarketplace", {
    args: [feeTreasury, kycSignerAddress],
  });

  return { marketplace };
});

export default EquitySecondaryMarketplaceModule;
