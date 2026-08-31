// backend/services/kycSignerService.js
// Generates a backend-signed EIP-712 KYC authorization ticket.
// This proves to the smart contract that BOTH the buyer and seller
// have passed KYC verification via Didit, without storing any
// sensitive data on-chain.
//
// The private key used here must match the `kycSignerAddress` that was
// set in the EquitySecondaryMarketplace constructor at deployment time.
// Store it in .env as KYC_SIGNER_PRIVATE_KEY — NEVER commit this value.

const { ethers } = require('ethers');
const { supabaseAdmin } = require('../config/supabaseAdmin');

// EIP-712 domain — must match the contract constructor:
//   EIP712("EquityMarketplace", "1")
const DOMAIN = {
  name: 'EquityMarketplace',
  version: '1',
  // chainId is added dynamically per request
};

// Must match KYC_TYPEHASH in secondaryMarketplace.sol:
//   "KycVerification(address buyer,address seller,uint256 deadline)"
const KYC_TYPES = {
  KycVerification: [
    { name: 'buyer',    type: 'address' },
    { name: 'seller',   type: 'address' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Verify that both buyer and seller are KYC-approved in the DB,
 * then sign an EIP-712 KYC authorization ticket with the backend key.
 *
 * @param {string} buyerWallet   - Buyer's MetaMask address
 * @param {string} sellerWallet  - Seller's MetaMask address
 * @param {number} chainId       - Network chain ID (11155111 for Sepolia)
 * @returns {{ kycSignature: string, kycDeadline: number }}
 */
async function generateKycSignature(buyerWallet, sellerWallet, chainId = 11155111) {
  const privateKey = process.env.KYC_SIGNER_PRIVATE_KEY;
  const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;

  if (!privateKey) {
    throw new Error('KYC_SIGNER_PRIVATE_KEY is not set in .env');
  }
  if (!marketplaceAddress || !ethers.isAddress(marketplaceAddress)) {
    throw new Error('MARKETPLACE_CONTRACT_ADDRESS is not set or invalid in .env');
  }
  if (!ethers.isAddress(buyerWallet) || !ethers.isAddress(sellerWallet)) {
    throw new Error('Invalid buyer or seller wallet address');
  }

  // 1. Verify buyer identity in DB
  const { data: buyerProfile, error: buyerErr } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified, trading_restricted')
    .eq('wallet_address', buyerWallet.toLowerCase())
    .single();

  if (buyerErr || !buyerProfile) {
    throw new Error('Buyer wallet address not linked to any verified profile');
  }
  if (!buyerProfile.identity_verified) {
    throw new Error('Buyer has not completed KYC verification');
  }
  if (buyerProfile.trading_restricted) {
    throw new Error('Buyer account is restricted from trading');
  }

  // 2. Verify seller identity in DB
  const { data: sellerProfile, error: sellerErr } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified, trading_restricted')
    .eq('wallet_address', sellerWallet.toLowerCase())
    .single();

  if (sellerErr || !sellerProfile) {
    throw new Error('Seller wallet address not linked to any verified profile');
  }
  if (!sellerProfile.identity_verified) {
    throw new Error('Seller has not completed KYC verification');
  }
  if (sellerProfile.trading_restricted) {
    throw new Error('Seller account is restricted from trading');
  }

  // 3. Build domain with contract address and chain ID
  const domain = {
    ...DOMAIN,
    chainId: BigInt(chainId),
    verifyingContract: marketplaceAddress,
  };

  // 4. KYC ticket valid for 15 minutes
  const kycDeadline = Math.floor(Date.now() / 1000) + 15 * 60;

  const kycValue = {
    buyer:    buyerWallet,
    seller:   sellerWallet,
    deadline: BigInt(kycDeadline),
  };

  // 5. Sign with backend private key
  const wallet = new ethers.Wallet(privateKey);
  const kycSignature = await wallet.signTypedData(domain, KYC_TYPES, kycValue);

  return { kycSignature, kycDeadline };
}

module.exports = { generateKycSignature };
