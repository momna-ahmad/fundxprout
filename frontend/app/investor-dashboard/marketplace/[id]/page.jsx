// frontend/app/investor-dashboard/marketplace/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getCampaignById } from '@/utils/supabase/getCampaigns';
import OrderBook from '@/components/Marketplace/OrderBook';
import TradeHistory from '@/components/Marketplace/TradeHistory';
import ValuationChart from '@/components/Marketplace/ValuationChart';
import OrderForm from '@/components/Marketplace/OrderForm';

const sampleSnapshots = [
  {
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 4,
    value: 0.92,
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 3,
    value: 0.98,
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 2,
    value: 1.05,
  },
  {
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 1,
    value: 1.12,
  },
  {
    timestamp: Math.floor(Date.now() / 1000),
    value: 1.08,
  },
];

function calcDaysLeft(createdAt, durationDays) {
  if (!createdAt || !durationDays) return 0;

  const deadline = new Date(
    new Date(createdAt).getTime() +
      durationDays * 24 * 60 * 60 * 1000
  );

  const diff = Math.ceil(
    (deadline.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  return diff > 0 ? diff : 0;
}

export default function CampaignMarketplacePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Because your folder is [id], the parameter is params.id
  const campaignId = params?.id;
  const defaultSide = searchParams.get('side') === 'sell' ? 'sell' : 'buy';

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!campaignId) return;

    async function loadCampaign() {
      setLoading(true);
      setError(null);

      try {
        const result = await getCampaignById(campaignId);

        if (!result) {
          setError('Campaign not found.');
          setCampaign(null);
        } else {
          setCampaign(result);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load campaign.');
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        Loading campaign market…
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-destructive">
        {error || 'Campaign could not be loaded.'}
      </div>
    );
  }

  const raised = parseFloat(campaign.amount_pledged ?? '0');
  const goal = parseFloat(campaign.funding_goal ?? '0');

  const progress =
    goal > 0
      ? Math.min((raised / goal) * 100, 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/investor-dashboard/marketplace"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-ring"
        >
          <ArrowLeft size={16} />
          Back to marketplace
        </Link>

        <div className="rounded-3xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {campaign.secondary_trading_enabled
            ? 'Secondary trading enabled'
            : 'Secondary trading unavailable'}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Marketplace campaign
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-foreground">
              {campaign.title || 'Untitled Campaign'}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              {campaign.description ||
                'No detailed campaign description is available for this marketplace listing.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-border bg-background/80 p-4 text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Goal
              </div>

              <div className="mt-2 text-xl font-semibold text-foreground">
                {campaign.funding_goal ?? 'N/A'} ETH
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background/80 p-4 text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Raised
              </div>

              <div className="mt-2 text-xl font-semibold text-foreground">
                {campaign.amount_pledged ?? '0'} ETH
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background/80 p-4 text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Investors
              </div>

              <div className="mt-2 text-xl font-semibold text-foreground">
                {campaign.investor_count ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-background/70">
          <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Funding progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>

          <div className="h-3 bg-border">
            <div
              className="h-full bg-ring transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <OrderBook campaignId={campaign.id} />

            <TradeHistory trades={[]} />
          </div>

          <ValuationChart snapshots={sampleSnapshots} />
        </div>

        <div className="space-y-6">
          <OrderForm
            campaignId={campaign.id}
            tokenAddress={campaign.token_contract_address}
            defaultSide={defaultSide}
          />

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-foreground">
              Campaign details
            </div>

            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  Category:{' '}
                </span>
                {campaign.category ?? 'Uncategorized'}
              </div>

              <div>
                <span className="font-semibold text-foreground">
                  Duration:{' '}
                </span>
                {calcDaysLeft(
                  campaign.created_at,
                  campaign.duration
                )}{' '}
                days remaining
              </div>

              <div>
                <span className="font-semibold text-foreground">
                  Created:{' '}
                </span>

                {campaign.created_at
                  ? new Date(
                      campaign.created_at
                    ).toLocaleDateString()
                  : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
