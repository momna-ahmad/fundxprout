'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import BuyTokenButton from '@/components/Marketplace/BuyTokenButton';
import { getOpenSellOrders, type MarketplaceSellOrder } from '@/lib/marketplace-api';

function numeric(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortAddress(address: string | null) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Unknown';
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
      setOrders(result.orders || []);
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
          These are active sell orders from the Supabase token order book. Buying settles the selected token order directly on-chain.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token listings…" className="w-full rounded-3xl border border-border bg-card px-12 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring" />
        </div>
        <div className="text-sm text-muted-foreground">{filteredOrders.length} token listing{filteredOrders.length === 1 ? '' : 's'} available</div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">Loading token listings…</div>
      ) : error ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-destructive">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">No active token sell orders match your search.</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredOrders.map((order) => {
            const quantity = numeric(order.quantity_remaining);
            const price = numeric(order.price);
            return (
              <article key={order.id} className="overflow-hidden rounded-3xl border border-border bg-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold text-foreground">{order.campaign?.title || 'Token listing'}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{order.campaign?.category || 'Uncategorized'} · seller {shortAddress(order.seller_wallet_address)}</p>
                    {!order.seller_wallet_address && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Seller must link their wallet before this order can be purchased on-chain.</p>}
                  </div>
                  <span className="rounded-2xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">For sale</span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border bg-background/80 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tokens</div><div className="mt-1 font-semibold text-foreground">{quantity}</div></div>
                  <div className="rounded-2xl border border-border bg-background/80 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Each</div><div className="mt-1 font-semibold text-foreground">{price} ETH</div></div>
                  <div className="rounded-2xl border border-border bg-background/80 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total</div><div className="mt-1 font-semibold text-foreground">{(quantity * price).toFixed(6)} ETH</div></div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <BuyTokenButton order={order} onPurchased={(orderId) => setOrders((current) => current.filter((item) => item.id !== orderId))} />
                  <Link href={`/investor-dashboard/marketplace/${order.campaign_id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-ring">
                    Market <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
