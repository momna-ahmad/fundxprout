import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignFactoryModule = buildModule("CampaignFactoryModule", (m) => {
  // Yeh aapke contract ko deploy karega
  const factory = m.contract("CampaignFactory");

  return { factory };
});

export default CampaignFactoryModule;