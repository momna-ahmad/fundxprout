import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { EquitySecondaryMarketplace , EquityToken} from "../typechain-types";

describe("EquitySecondaryMarketplace", function () {
  let marketplace: EquitySecondaryMarketplace;
  let token: EquityToken;
  let campaignManager: HardhatEthersSigner;
  let owner: HardhatEthersSigner;
  let feeTreasury: HardhatEthersSigner;
  let kycSigner: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;

  let domain: any;

  // EIP-712 Types definition matching the smart contract
  const types = {
    Order: [
      { name: "seller", type: "address" },
      { name: "tokenAddress", type: "address" },
      { name: "tokenAmount", type: "uint256" },
      { name: "pricePerToken", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    KycVerification: [
      { name: "buyer", type: "address" },
      { name: "seller", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [owner, feeTreasury, campaignManager, kycSigner, seller, buyer] = await ethers.getSigners();

    // Deploy EquityToken with campaignManager address
    const EquityToken = await ethers.getContractFactory("EquityToken");
    token = await EquityToken.deploy(
      "Startup Equity",
      "SEQ",
      campaignManager.address
    );
    await token.waitForDeployment();

    // 2. Deploy Secondary Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("EquitySecondaryMarketplace");
    marketplace = (await MarketplaceFactory.deploy(
      feeTreasury.address,
      kycSigner.address
    )) as EquitySecondaryMarketplace;
    await marketplace.waitForDeployment();

    const marketplaceAddress = await marketplace.getAddress();
    const network = await ethers.provider.getNetwork();

    // 3. Define EIP-712 Domain Separator
    domain = {
      name: "EquityMarketplace",
      version: "1",
      chainId: network.chainId,
      verifyingContract: marketplaceAddress,
    };

    // 4. Mint tokens to seller & Approve Marketplace contract
    const mintAmount = ethers.parseEther("1000");
      // Mint tokens to the seller using the campaignManager signer
    await token.connect(campaignManager).mintEquity(seller.address, ethers.parseEther("100"));
    await token.connect(seller).approve(marketplaceAddress, mintAmount);
  });

  describe("Basic Swap Test (Tokens for ETH)", function () {
    it("Should successfully execute an atomic swap between buyer and seller", async function () {
      const tokenAddress = await token.getAddress();
      const tokenAmount = ethers.parseEther("100"); // 100 EQT Tokens
      const pricePerToken = ethers.parseEther("0.01"); // 0.01 ETH per token
      const totalPrice = (tokenAmount * pricePerToken) / ethers.parseEther("1"); // 1.0 ETH
      const nonce = 1;

      const latestBlock = await ethers.provider.getBlock("latest");
      const expiry = latestBlock!.timestamp + 3600; // 1 hour validity
      const kycDeadline = latestBlock!.timestamp + 1800; // 30 min validity

      // ── Step A: Generate Seller EIP-712 Order Signature ──
      const orderValue = {
        seller: seller.address,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        pricePerToken: pricePerToken,
        nonce: nonce,
        expiry: expiry,
      };

      const sellerOrderSignature = await seller.signTypedData(
        domain,
        { Order: types.Order },
        orderValue
      );

      // ── Step B: Generate Backend Didit KYC Signature ──
      const kycValue = {
        buyer: buyer.address,
        seller: seller.address,
        deadline: kycDeadline,
      };

      const kycSignature = await kycSigner.signTypedData(
        domain,
        { KycVerification: types.KycVerification },
        kycValue
      );

      // Record balances prior to execution
      const sellerEthBefore = await ethers.provider.getBalance(seller.address);
      const treasuryEthBefore = await ethers.provider.getBalance(feeTreasury.address);
      const buyerTokensBefore = await token.balanceOf(buyer.address);

      // ── Step C: Buyer Calls fillOrder ──
      const tx = await marketplace.connect(buyer).fillOrder(
        seller.address,
        tokenAddress,
        tokenAmount,
        pricePerToken,
        nonce,
        expiry,
        sellerOrderSignature,
        kycDeadline,
        kycSignature,
        { value: totalPrice }
      );

      await tx.wait();

      // ── Step D: Assertions & Expected Computations ──

      // 1. Calculate Expected Fee (2%) and Seller Payout (98%)
      const expectedFee = (totalPrice * 200n) / 10000n; // 0.02 ETH
      const expectedSellerPayout = totalPrice - expectedFee; // 0.98 ETH

      // 2. Verify ETH Balance Changes
      const sellerEthAfter = await ethers.provider.getBalance(seller.address);
      const treasuryEthAfter = await ethers.provider.getBalance(feeTreasury.address);

      expect(sellerEthAfter - sellerEthBefore).to.equal(expectedSellerPayout);
      expect(treasuryEthAfter - treasuryEthBefore).to.equal(expectedFee);

      // 3. Verify Equity Token Balance Changes
      const buyerTokensAfter = await token.balanceOf(buyer.address);
      expect(buyerTokensAfter - buyerTokensBefore).to.equal(tokenAmount);

      // 4. Verify Nonce Is Marked Invalidated
      const isUsed = await marketplace.isNonceInvalidated(seller.address, nonce);
      expect(isUsed).to.be.true;
    });
  });
});