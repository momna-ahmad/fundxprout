import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun", //for mcopy instruction 
      viaIR: true, // Fixes "Stack too deep" error (16 variables limit fo ra function )
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.METAMASK_PRIVATE_KEY!],
      timeout: 60000, // 60 seconds
    },
  },
};

export default config;
