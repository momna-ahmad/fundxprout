'use client';

// frontend/app/investor-dashboard/my-listings/page.tsx
// Seller views their own sell listings and the bids placed on each one.
// Sellers can accept a bid from this page.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getListingBids, acceptBid, type TokenBid } from '@/lib/bidding-api';
import {
  Loader2, ChevronDown, ChevronUp, CheckCircle2, Trophy,
  Clock, AlertCircle, RotateCcw,
} from 'lucide-react';

type Listing = {
  id: string;
  campaign_id: string;
  price: number;
  quantity: number;
  quantity_remaining: number;
  quantity_filled: number;
  status: string;
  seller_signature: string | null;
  created_at: string;
  campaign?: { title: string | null; category: string | null; token_contract_address: string | null };
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeLeft(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

// ── One Listing Row with expandable bid list ─────────────────────
function ListingRow({ listing, userId }: { listing: Listing; userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [bids, setBids] = useState<TokenBid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadBids() {
    setBidsLoading(true);
    setBidsError(null);
    try {
      const result = await getListingBids(listing.id);
      setBids(result.bids || []);
    } catch (err: any) {
      setBidsError(err.message);
    } finally {
      setBidsLoading(false);
    }
  }

  function handleToggle() {
    if (!expanded) loadBids();
    setExpanded((v) => !v);
  }

  async function handleAccept(bidId: string) {
    setMsg(null);
    setAccepting(bidId);
    try {
      await acceptBid(bidId);
      setMsg('Bid accepted! The buyer has 24 hours to confirm their purchase.');
      // Refresh bids
      await loadBids();
    } catch (err: any) {
      setMsg(err.message || 'Failed to accept bid.');
    } finally {
      setAccepting(null);
    }
  }

  const pendingBids = bids.filter((b) => b.status === 'pending');
  const activeBids = bids.filter((b) => ['pending', 'accepted', 'confirmed'].includes(b.status));

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      {/* Listing header row */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-muted/20"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground truncate">
              {listing.campaign?.title || `Campaign #${listing.campaign_id}`}
            </p>
            <span
              className="rounded-xl px-2 py-0.5 text-[10px] font-bold"
              style={
                listing.status === 'open'
                  ? { color: 'var(--chart-3)', background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)' }
                  : listing.status === 'filled'
                  ? { color: 'var(--muted-foreground)', background: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)' }
                  : { color: 'var(--destructive)', background: 'color-mix(in srgb, var(--destructive) 10%, transparent)' }
              }
            >
              {listing.status.toUpperCase()}
            </span>
            {!listing.seller_signature && (
              <span className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                <AlertCircle size={9} /> Unsigned
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {listing.quantity_remaining} / {listing.quantity} tokens remaining · {listing.price} ETH/token
            · {timeAgo(listing.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {pendingBids.length > 0 && !expanded && (
            <span
              className="rounded-xl px-2.5 py-1 text-xs font-bold"
              style={{ color: 'var(--ring)', background: 'color-mix(in srgb, var(--ring) 12%, transparent)' }}
            >
              {pendingBids.length} new bid{pendingBids.length > 1 ? 's' : ''}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded bid list */}
      {expanded && (
        <div className="border-t border-border bg-background/40 px-5 py-4">
          {bidsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading bids…
            </div>
          ) : bidsError ? (
            <p className="text-sm text-destructive">{bidsError}</p>
          ) : activeBids.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bids yet on this listing.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Ranked header */}
              <div className="mb-1 grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>#</span>
                <span>Buyer</span>
                <span>Qty</span>
                <span>Price/Token</span>
                <span>Action</span>
              </div>

              {activeBids.map((bid, idx) => {
                const isAccepted = ['accepted', 'confirmed', 'completed'].includes(bid.status);
                const isAccepting = accepting === bid.id;
                const buyer = bid.profiles;

                return (
                  <div
                    key={bid.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                    style={idx === 0 && bid.status === 'pending' ? {
                      borderColor: 'color-mix(in srgb, var(--chart-5) 40%, transparent)',
                    } : {}}
                  >
                    {/* Rank */}
                    <span className="text-sm font-bold" style={{ color: idx === 0 ? 'var(--chart-5)' : 'var(--muted-foreground)' }}>
                      {idx === 0 ? <Trophy size={14} /> : `#${idx + 1}`}
                    </span>

                    {/* Buyer info */}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {buyer?.display_name || buyer?.full_name || `${bid.buyer_wallet.slice(0, 6)}…${bid.buyer_wallet.slice(-4)}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {bid.status === 'pending'
                          ? `Expires in ${timeLeft(bid.bid_expires_at) || 'soon'}`
                          : bid.status === 'accepted'
                          ? `Buyer has ${timeLeft(bid.accept_deadline) || '—'} to confirm`
                          : bid.status === 'confirmed'
                          ? 'Buyer is completing the on-chain tx…'
                          : bid.status}
                        {' '}· KYC: {buyer?.identity_verified ? '✅' : '⚠️'}
                      </p>
                    </div>

                    {/* Quantity */}
                    <span className="text-sm font-semibold text-foreground">{bid.quantity}</span>

                    {/* Price */}
                    <span className="text-sm font-bold" style={{ color: 'var(--ring)' }}>
                      {bid.bid_price_per_token} ETH
                    </span>

                    {/* Action */}
                    <div>
                      {isAccepted ? (
                        <span className="flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold"
                          style={{ color: 'var(--chart-3)', background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)' }}>
                          <CheckCircle2 size={11} /> Accepted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAccept(bid.id)}
                          disabled={!!accepting || !listing.seller_signature}
                          title={!listing.seller_signature ? 'Sign your listing first before accepting bids' : ''}
                          className="rounded-xl px-3 py-1.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, var(--ring), var(--chart-5))' }}
                        >
                          {isAccepting ? <Loader2 size={12} className="animate-spin" /> : 'Accept'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {msg && (
                <p className="mt-1 text-xs" style={{ color: msg.includes('accepted') ? 'var(--chart-3)' : 'var(--destructive)' }}>
                  {msg}
                </p>
              )}

              {!listing.seller_signature && (
                <div className="mt-2 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Your listing is not yet signed. You must sign it with MetaMask (via the Marketplace or Order Form) before you can accept bids.
                    Once signed, the buyer can complete the on-chain <code>fillOrder()</code> transaction.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  const loadListings = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    try {
      setLoading(true);
      setError(null);
      const { data, error: dbErr } = await supabase
        .from('token_orders')
        .select(`
          id, campaign_id, price, quantity, quantity_remaining, quantity_filled,
          status, seller_signature, created_at,
          campaigns:campaign_id ( title, category, token_contract_address )
        `)
        .eq('investor_id', user.id)
        .eq('side', 'sell')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      setListings((data as any) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadListings(); }, [loadListings]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Secondary Marketplace</div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Listings & Bids</h1>
          <button
            onClick={loadListings}
            className="flex items-center gap-1.5 rounded-2xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-ring hover:text-foreground"
          >
            <RotateCcw size={13} /> Refresh
          </button>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl">
          Review bids placed on your sell listings. Click on a listing to expand and see all bids — ranked by highest offer. Accept the best bid to notify the buyer.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">{error}</div>
      ) : listings.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <Clock size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground">No sell listings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a sell order in the Marketplace to start receiving bids.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
