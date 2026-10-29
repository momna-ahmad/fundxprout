// frontend/app/investor-dashboard/marketplace/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react';
import { getCampaignById } from '@/utils/supabase/getCampaigns';
import { getCampaignFinancialReports } from '@/lib/marketplace-api';
import OrderBook from '@/components/Marketplace/OrderBook';
import OrderForm from '@/components/Marketplace/OrderForm';

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

function formatUsd(value) {
  const amount = Number(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/* ------------------------------------------------------------------ */
/*  Financial reports                                                  */
/* ------------------------------------------------------------------ */
function FinancialReportsSection({ reports, loading }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-ring">
            <FileText size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Financial reports</h2>
            <p className="text-xs text-muted-foreground">
              Revenue, burn rate and cash position shared by the founders.
            </p>
          </div>
        </div>
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {reports.length} report{reports.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-4 py-4 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-ring" />
            Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-background/50 px-4 py-5 text-sm text-muted-foreground">
            The founders haven&apos;t submitted a financial report yet.
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-background/60">
            {reports.map((report) => {
              const isApproved = report.status === 'approved';
              const isRejected = report.status === 'rejected';
              const statusLabel = isApproved ? 'Verified' : isRejected ? 'Rejected' : 'Under review';
              const statusClass = isApproved
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : isRejected
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
              const dotClass = isApproved ? 'bg-green-400' : isRejected ? 'bg-destructive' : 'bg-amber-500';

              return (
                <details key={report.id} className="group/report">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {report.period_label || `FY ${report.fiscal_year}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Fiscal year {report.fiscal_year} &middot; Revenue{' '}
                        <span className="tabular-nums text-foreground/80">{formatUsd(report.gross_revenue)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                        {statusLabel}
                      </span>
                      <ChevronDown
                        size={15}
                        className="text-muted-foreground transition-transform duration-200 group-open/report:rotate-180"
                      />
                    </div>
                  </summary>

                  <div className="border-t border-border bg-card/60 px-4 py-4">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      {[
                        ['Gross revenue', report.gross_revenue],
                        ['Burn rate', report.burn_rate],
                        ['Net income / loss', report.net_income_loss],
                        ['Beginning cash', report.beginning_cash],
                        ['Operating cash flow', report.operating_cash_flow],
                        ['Ending cash', report.ending_cash],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                            {formatUsd(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2
                          size={14}
                          className={report.is_audited ? 'text-green-400' : 'text-muted-foreground/50'}
                        />
                        {report.is_audited ? 'Audited / independently reviewed' : 'Not marked as audited'}
                      </span>
                      {report.file_url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <ExternalLink size={12} /> View report
                          </a>
                          <a
                            href={report.file_url}
                            download
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Download size={12} /> Download
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Report file unavailable</span>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CampaignMarketplacePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Because your folder is [id], the parameter is params.id
  const campaignId = params?.id;
  // Opens on the sell side unless the link explicitly asks for ?side=buy
  const defaultSide = searchParams.get('side') === 'buy' ? 'buy' : 'sell';

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financialReports, setFinancialReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

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

  // Financial reports for this campaign (grouped by campaign_id)
  useEffect(() => {
    if (!campaign?.id) return;

    async function loadReports() {
      setReportsLoading(true);
      const numericId = Number(campaign.id);

      if (Number.isSafeInteger(numericId) && numericId > 0) {
        try {
          const { reports } = await getCampaignFinancialReports([numericId]);
          setFinancialReports(reports || []);
        } catch (err) {
          console.error('[Marketplace campaign financial reports]', err);
          setFinancialReports([]);
        }
      } else {
        setFinancialReports([]);
      }
      setReportsLoading(false);
    }

    loadReports();
  }, [campaign?.id]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        Loading campaign market…
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center text-destructive">
        {error || 'Campaign could not be loaded.'}
      </div>
    );
  }

  const detailHref = `/investor-dashboard/campaignDetail/${campaign.id}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/investor-dashboard/marketplace"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition hover:border-ring hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Back to marketplace
        </Link>

        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {campaign.secondary_trading_enabled
            ? 'Secondary trading enabled'
            : 'Secondary trading unavailable'}
        </div>
      </div>

      {/* Slim campaign bar */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">
              {campaign.title || 'Untitled Campaign'}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {campaign.category ?? 'Uncategorized'}
            </p>
          </div>

          <Link
            href={detailHref}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-muted"
          >
            View campaign details <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <OrderBook campaignId={campaign.id} />

          <FinancialReportsSection reports={financialReports} loading={reportsLoading} />
        </div>

        <div className="space-y-6">
          <OrderForm
            campaignId={campaign.id}
            tokenAddress={campaign.token_contract_address}
            defaultSide={defaultSide}
          />

          <div className="rounded-lg border border-border bg-card p-5">
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