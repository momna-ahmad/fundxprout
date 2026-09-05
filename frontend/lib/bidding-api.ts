// frontend/lib/bidding-api.ts
// Client-side functions for the auction-style bidding system.
// All functions call the backend biddingRoutes endpoints.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

import { createClient } from '@/utils/supabase/client';

// ── Types ────────────────────────────────────────────────────────

export type BidStatus =
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type TokenBid = {
  id: string;
  listing_id: string;
  campaign_id: string;
  buyer_id: string;
  buyer_wallet: string;
  bid_price_per_token: number;
  quantity: number;
  status: BidStatus;
  bid_expires_at: string;
  accept_deadline: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
  // Joined from token_orders → campaigns
  token_orders?: {
    price: number;
    quantity_remaining: number;
    seller_wallet_address: string | null;
    seller_signature: string | null;
    seller_nonce: number | null;
    campaigns?: {
      title: string | null;
      category: string | null;
      token_contract_address: string | null;
      token_symbol: string | null;
    } | null;
  } | null;
  // Joined from profiles (when seller views bids on their listing)
  profiles?: {
    full_name: string | null;
    display_name: string | null;
    identity_verified: boolean;
  } | null;
};

export type SettlementData = {
  seller_wallet: string;
  seller_signature: string;
  seller_nonce: number;
  token_contract_address: string;
  quantity: number;
  price_per_token: number;
};

// ── Auth helper ──────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── API Functions ────────────────────────────────────────────────

/** Buyer: place a bid on a sell listing */
export async function placeBid(payload: {
  listing_id: string;
  bid_price_per_token: number;
  quantity: number;
  buyer_wallet: string;
  bid_expires_days?: number;
}): Promise<{ bid: TokenBid; message: string }> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to place bid');
  }
  return res.json();
}

/** Buyer: get all my bids */
export async function getMyBids(): Promise<{ bids: TokenBid[] }> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids/my`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load your bids');
  return res.json();
}

/** Buyer: cancel a pending bid */
export async function cancelBid(bidId: string): Promise<{ bid: TokenBid; message: string }> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids/${bidId}/cancel`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to cancel bid');
  }
  return res.json();
}

/** Buyer: confirm an accepted bid (returns settlement data needed for fillOrder) */
export async function confirmBid(bidId: string): Promise<{
  message: string;
  settlement_data: SettlementData;
}> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids/${bidId}/confirm`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to confirm bid');
  }
  return res.json();
}

/** Buyer: mark bid as completed after on-chain tx succeeds */
export async function completeBid(
  bidId: string,
  tx_hash: string,
  block_number?: number
): Promise<{ message: string; tx_hash: string }> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids/${bidId}/complete`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ tx_hash, block_number }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to complete bid');
  }
  return res.json();
}

/** Seller: get all bids on a specific listing */
export async function getListingBids(listingId: string): Promise<{
  listing: any;
  bids: TokenBid[];
}> {
  const res = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/bids`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load bids for listing');
  return res.json();
}

/** Seller: accept a specific bid */
export async function acceptBid(bidId: string): Promise<{
  bid: TokenBid;
  accept_deadline: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/api/marketplace/bids/${bidId}/accept`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to accept bid');
  }
  return res.json();
}

/** Seller: save EIP-712 signature for a listing */
export async function signListing(
  listingId: string,
  seller_signature: string,
  seller_nonce: number
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/marketplace/listings/${listingId}/sign`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ seller_signature, seller_nonce }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to sign listing');
  }
  return res.json();
}
