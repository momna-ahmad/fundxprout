// ── frontend/app/investor-dashboard/marketplace/page.tsx ───────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, ChevronRight } from 'lucide-react';
import { getAllCampaigns } from '@/utils/supabase/getCampaigns';

type Campaign = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  funding_goal?: string;
  amount_pledged?: string;
  secondary_trading_enabled?: boolean;
};

export default function InvestorMarketplacePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoading(true);
        setError(null);
        const all = await getAllCampaigns();
        setCampaigns(
          (all || []).filter(
            (campaign: any) => campaign.secondary_trading_enabled === true,
          ),
        );
      } catch (err) {
        console.error(err);
        setError('Unable to load marketplace campaigns.');
      } finally {
        setLoading(false);
      }
    }

    loadCampaigns();
  }, []);

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [campaign.title, campaign.description, campaign.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Investor Marketplace
        </div>
        <h1 className="text-3xl font-bold text-foreground">Secondary Trading Campaigns</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Browse campaigns that support tokenized secondary trading and open a dedicated market screen for each.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns by title, category, or description…"
            className="w-full rounded-3xl border border-border bg-card px-12 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredCampaigns.length} campaign{filteredCampaigns.length === 1 ? '' : 's'} available
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading marketplace campaigns…
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-destructive">
          {error}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          No campaigns match your search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCampaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/investor-dashboard/marketplace/${campaign.id}`}
              className="group block overflow-hidden rounded-3xl border border-border bg-card p-6 transition hover:border-ring hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-foreground truncate">
                    {campaign.title || 'Untitled Campaign'}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-3">
                    {campaign.description || 'No campaign description available.'}
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  Trade
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background/80 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Funding Goal
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {campaign.funding_goal ?? 'N/A'} ETH
                  </div>
                </div>
                <div className="rounded-3xl border border-border bg-background/80 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Raised
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {campaign.amount_pledged ?? '0'} ETH
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="rounded-2xl border border-border px-3 py-2 bg-muted/70">
                  {campaign.category || 'Uncategorized'}
                </span>
                <span className="rounded-2xl border border-border px-3 py-2 bg-muted/70">
                  Secondary enabled
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm font-semibold text-muted-foreground">
                <span>View market</span>
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
