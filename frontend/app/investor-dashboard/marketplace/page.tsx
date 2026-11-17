//frontend/app/investor-dashboard/marketplace/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import PlaceBidModal from '@/components/Marketplace/PlaceBidModal';
import { getOpenSellOrders, type MarketplaceSellOrder } from '@/lib/marketplace-api';

function numeric(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortAddress(address: string | null) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Unknown';
}

function tokenColor(campaignId: string) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1'];
  const hash = String(campaignId).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function ListingCard({
  order,
  onBidPlaced,
}: {
  order: MarketplaceSellOrder;
  onBidPlaced: () => void;
}) {
  const [showBidModal, setShowBidModal] = useState(false);
  const quantity = numeric(order.quantity_remaining);
  const price = numeric(order.price);
  const isAuto = order.listing_mode === 'auto';

  return (
    <>
      <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-ring/50">
        <div>
          <div className="flex items-start gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 px-1 text-center text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${tokenColor(order.campaign_id)}, rgba(0,0,0,0.4))`,
                boxShadow: `0 0 18px ${tokenColor(order.campaign_id)}33`,
              }}
            >
              <span className="line-clamp-2 break-all">{order.campaign?.token_symbol || '—'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug text-foreground">{order.campaign?.title || 'Token listing'}</h2>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {order.campaign?.category || 'Uncategorized'} · seller {shortAddress(order.seller_wallet_address)}
              </p>
              {!order.seller_wallet_address && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Seller must link their wallet before this order can be traded.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {isAuto && (
                <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500">
                  Auto Auction
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tokens available</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">{quantity}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Asking price</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">{price} ETH</div>
            </div>
            <div className="col-span-2 flex items-center justify-between border-t border-border/60 pt-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {order.min_bid_price_per_token ? 'Min Bid Floor' : 'Total'}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {order.min_bid_price_per_token ? `${numeric(order.min_bid_price_per_token)} ETH` : `${(quantity * price).toFixed(6)} ETH`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setShowBidModal(true)}
            className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-ring px-3 text-xs font-semibold text-ring transition-colors hover:bg-ring/10 active:bg-ring/15"
          >
            Place Bid
          </button>

          <Link
            href={`/investor-dashboard/marketplace/${order.campaign_id}`}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-green-500/60 bg-transparent px-3 text-xs font-semibold text-green-500 transition-colors hover:bg-green-500/10"
          >
            Market <ArrowRight size={15} className="text-green-500" />
          </Link>
        </div>
      </article>

      {showBidModal && (
        <PlaceBidModal
          order={order}
          onClose={() => setShowBidModal(false)}
          onBidPlaced={() => {
            setShowBidModal(false);
            onBidPlaced();
          }}
        />
      )}
    </>
  );
}

export default function InvestorMarketplacePage() {
  const [orders, setOrders] = useState<MarketplaceSellOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getOpenSellOrders();
      const nextOrders = result.orders || [];
      setOrders(nextOrders);
    } catch (err) {
      console.error(err);
      setError('Unable to load token listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      [order.campaign?.title, order.campaign?.category, order.campaign?.token_contract_address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [orders, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Investor Marketplace</div>
        <h1 className="text-3xl font-bold text-foreground">Tokens for sale</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Browse active sell orders. Place a bid with your own offer to win tokens via automated auction or seller review.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token listings…" className="w-full rounded-3xl border border-border bg-card px-12 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
        </div>
        <div className="text-sm text-muted-foreground">{filteredOrders.length} listing{filteredOrders.length === 1 ? '' : 's'} available</div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">Loading token listings…</div>
      ) : error ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-destructive">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">No active token sell orders match your search.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <ListingCard
              key={order.id}
              order={order}
              onBidPlaced={loadOrders}
            />
          ))}
        </div>
      )}
    </div>
  );
}
