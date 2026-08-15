// frontend/lib/marketplace-api.ts
import { createClient } from '@/utils/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:5000';

export type OrderRequest = {
  campaign_id: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
};

export type OrderResponse = { order: any };

async function authHeaders(walletAddress?: string) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error('You must be signed in to trade.');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(walletAddress ? { 'x-wallet-address': walletAddress } : {}),
  };
}

export async function createOrder(payload: OrderRequest, walletAddress?: string): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/api/marketplace/orders`, {
    method: 'POST',
    headers: await authHeaders(walletAddress),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errBody: any = null;
    try { errBody = await res.json(); } catch { /* ignore */ }
    throw new Error(errBody?.error || res.statusText || 'Marketplace API error');
  }
  return res.json();
}

export async function getOrderBook(campaignId: string) {
  const res = await fetch(`${API_BASE}/api/marketplace/orders/book/${campaignId}`);
  if (!res.ok) throw new Error('Failed to load order book');
  return res.json();
}

export async function getTradeHistory(campaignId: string) {
  const res = await fetch(`${API_BASE}/api/marketplace/trades/${campaignId}`);
  if (!res.ok) throw new Error('Failed to load trade history');
  return res.json();
}

export async function getHoldings(campaignId: string): Promise<{ available_balance: number; locked_balance: number }> {
  const res = await fetch(`${API_BASE}/api/marketplace/holdings/${campaignId}`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!res.ok) {
    let errBody: any = null;
    try { errBody = await res.json(); } catch { /* ignore */ }
    throw new Error(errBody?.error || 'Failed to load marketplace holdings');
  }

  return res.json();
}