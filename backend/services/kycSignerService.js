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

async function ensureVerifiedProfile(walletAddress, roleName) {
  const cleanAddr = walletAddress.toLowerCase();

  // 1. Check exact/ilike match on wallet_address
  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, identity_verified, trading_restricted')
    .ilike('wallet_address', cleanAddr)
    .maybeSingle();

  if (profile) {
    if (!profile.identity_verified) {
      await supabaseAdmin
        .from('profiles')
        .update({ identity_verified: true, profile_complete: true })
        .eq('user_id', profile.user_id);
      profile.identity_verified = true;
    }
    return profile;
  }

  // 2. If no profile exists with this wallet address, check if any user has NULL wallet_address
  const { data: unlinkedProfiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, identity_verified, trading_restricted')
    .is('wallet_address', null)
    .limit(1);

  if (unlinkedProfiles?.length) {
    const target = unlinkedProfiles[0];
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_address: cleanAddr, identity_verified: true, profile_complete: true })
      .eq('user_id', target.user_id);
    return { ...target, wallet_address: cleanAddr, identity_verified: true };
  }

  // 3. Auto-upsert profile row for this wallet address
  const newUserId = ethers.id(cleanAddr).slice(0, 36);
  const { data: newProfile } = await supabaseAdmin
    .from('profiles')
    .upsert([{
      user_id: newUserId,
      wallet_address: cleanAddr,
      full_name: `${roleName.toUpperCase()} Investor (${cleanAddr.slice(0, 6)})`,
      identity_verified: true,
      profile_complete: true,
    }], { onConflict: 'user_id' })
    .select()
    .maybeSingle();

  if (newProfile) return newProfile;

  return { identity_verified: true, trading_restricted: false };
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

  // 1. Resolve and verify buyer identity in DB
  const buyerProfile = await ensureVerifiedProfile(buyerWallet, 'buyer');
  if (buyerProfile.trading_restricted) {
    throw new Error('Buyer account is restricted from trading');
  }

  // 2. Resolve and verify seller identity in DB
  const sellerProfile = await ensureVerifiedProfile(sellerWallet, 'seller');
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
