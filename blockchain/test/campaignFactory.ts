import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("CampaignFactory", function () {
  let factory: Contract;

  // Test Parameters
  const name = "Test Startup";
  const fundingGoal = ethers.parseEther("10"); // 10 ETH
  const durationInDays = 30;
  const pricePerToken = ethers.parseEther("0.01"); // 0.01 ETH

  beforeEach(async function () {
    // 1. Get the Contract Factory
    const Factory = await ethers.getContractFactory("CampaignFactory");
    
    // 2. Deploy the Factory
    // Add 'as unknown as Contract' at the end
    factory = (await Factory.deploy()) as unknown as Contract;
    
    // 3. Wait for deployment (Ethers v6 syntax)
    await factory.waitForDeployment();
  });

  it("Should allow a user to create a new campaign", async function () {
    // 1. Call the create function
    const tx = await factory.createCampaign(
      name,
      fundingGoal,
      durationInDays,
      pricePerToken
    );
    
    // 2. Wait for the transaction to be mined
    await tx.wait();

    // 3. Check if the campaign address was stored
    // In Solidity, arrays are accessed like functions: deployedCampaigns(index)
    const campaignAddress = await factory.deployedCampaigns(0);

    // 4. Validate results
    console.log("New Campaign deployed at:", campaignAddress);
    
    expect(campaignAddress).to.not.be.undefined;
    expect(campaignAddress).to.not.equal(ethers.ZeroAddress);
  });
});