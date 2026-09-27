// backend/services/kycSignerService.js
// Generates a backend-signed EIP-712 KYC authorization ticket.
// This proves to the smart contract that BOTH the buyer and seller
// have passed KYC verification via Didit, without storing any
// sensitive data on-chain.

const { ethers } = require('ethers');
const { supabaseAdmin } = require('../config/supabaseAdmin');

// EIP-712 domain — must match the contract constructor:
//   EIP712("EquityMarketplace", "1")
const DOMAIN = {
  name: 'EquityMarketplace',
  version: '1',
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

// shafqaat implemented — Fix 3: Removed auto-profile creation fallback.
// Previously, if a wallet was not registered in the DB, the service would
// automatically create a profile with identity_verified = true, completely
// bypassing KYC. Now any unregistered wallet receives a 403 error instead.
async function ensureVerifiedProfile(walletAddress, roleName) {
  const cleanAddr = walletAddress.toLowerCase();

  // Strict lookup: exact or case-insensitive match on wallet_address only.
  // No auto-creation, no fallback upsert.
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, identity_verified, trading_restricted')
    .ilike('wallet_address', cleanAddr)
    .maybeSingle();

  if (error) {
    console.error(`[kycSigner] DB error looking up ${roleName} wallet:`, error.message);
    throw new Error(`Unable to verify ${roleName} identity. Please try again.`);
  }

  if (!profile) {
    throw new Error(
      `${roleName} wallet ${cleanAddr.slice(0, 8)}… is not registered on this platform. ` +
      `Please sign in and complete KYC registration before trading.`
    );
  }

  if (!profile.identity_verified) {
    throw new Error(
      `${roleName} has not completed identity verification (KYC). ` +
      `Please complete your KYC check before trading.`
    );
  }

  if (profile.trading_restricted) {
    throw new Error(`${roleName} account is restricted from trading. Please contact support.`);
  }

  return profile;
}

/**
 * Verify that both buyer and seller are KYC-approved in the DB,
 * then sign an EIP-712 KYC authorization ticket with the backend key.
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

  // 1. Resolve and verify buyer identity in DB (strict — no auto-creation)
  const buyerProfile = await ensureVerifiedProfile(buyerWallet, 'Buyer');
  if (buyerProfile.trading_restricted) {
    throw new Error('Buyer account is restricted from trading');
  }

  // 2. Resolve and verify seller identity in DB (strict — no auto-creation)
  const sellerProfile = await ensureVerifiedProfile(sellerWallet, 'Seller');
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
    deadline: kycDeadline,
  };

  // 5. Sign EIP-712 payload with backend private key
  const wallet = new ethers.Wallet(privateKey);
  const kycSignature = await wallet.signTypedData(domain, KYC_TYPES, kycValue);

  return { kycSignature, kycDeadline };
}

module.exports = { generateKycSignature };
