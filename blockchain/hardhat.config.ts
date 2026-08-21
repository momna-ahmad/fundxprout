import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const SEPOLIA_URL = process.env.ALCHEMY_SEPOLIA_URL;
const PRIVATE_KEY = process.env.METAMASK_PRIVATE_KEY;

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
    hardhat: {},
    // Only register the Sepolia network if valid credentials are present
    ...(SEPOLIA_URL && PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_URL,
            accounts: [PRIVATE_KEY],
            timeout: 60000,
          },
        }
      : {}),
  },
};

export default config;