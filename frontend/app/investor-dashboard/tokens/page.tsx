// ── frontend/app/investor-dashboard/tokens/page.tsx ───────────────────────────────────────────────
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber, formatPercent, truncateAddress } from '@/lib/formatters';
import { getUserTokenHoldings } from '@/utils/supabase/getPortfolio';
import { Token } from '@/types';

// ── Badge helper ─────────────────────────────────────────────────────
function Badge({
  children,
  variant = 'purple',
}: {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'purple';
}) {
  const cls: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-destructive/10 text-destructive border-destructive/20',
    purple: 'bg-[#6f42c1]/15 text-[#a78bfa] border-[#6f42c1]/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls[variant]}`}>
      {children}
    </span>
  );
}

function formatEther(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`;
}

export default function TokensPage() {
  const [tokenHoldings, setTokenHoldings] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTokens() {
      try {
        const holdings = await getUserTokenHoldings();
        setTokenHoldings(holdings);
      } finally {
        setLoading(false);
      }
    }
    loadTokens();
  }, []);

  if (loading) {
    return <div className="text-center text-muted-foreground pt-10">Loading tokens...</div>;
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Network status bar ── */}
      <div className="bg-card border border-border rounded-2xl px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2.5 text-[13px]">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--chart-3)', boxShadow: '0 0 6px var(--chart-3)' }}
          />
          <span className="text-muted-foreground font-medium">Ethereum Mainnet</span>
        </div>  
        <div className="ml-auto">
          <button className="rounded-full border border-ring px-4 py-1.5 text-xs font-semibold text-ring transition-colors hover:bg-ring/10">
            + Import Token
          </button>
        </div>
      </div>

      {/* ── Token Cards ── */}
      {tokenHoldings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tokenHoldings.map((token) => {
            const changeIsPositive = token.change24h !== null && token.change24h >= 0;

            return (
            <div
              key={token.id}
              className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-ring/50"
            >
              {/* Token header */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-ring/30 px-1 text-center text-[10px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${token.color}, rgba(0,0,0,0.4))`,
                  }}
                >
                  <span className="line-clamp-2 break-all">{token.symbol || '—'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground">{token.name}</div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {truncateAddress(token.contractAddress || '0x...', 8, 5)}
                  </div>
                </div>
                {token.change24h === null ? (
                  <span className="text-[11px] text-muted-foreground">24h change unavailable</span>
                ) : (
                  <Badge variant={changeIsPositive ? 'green' : 'red'}>
                    {changeIsPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {formatPercent(token.change24h)}
                  </Badge>
                )}
              </div>

              {/* Balance + value */}
              <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 border-y border-border py-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</div>
                  <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">{formatNumber(token.balance)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Position Value</div>
                  <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">
                    {formatEther(token.balance * token.priceEth)}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                  <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{token.priceLabel}</div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatEther(token.priceEth ?? 0)} <span className="text-xs font-normal text-muted-foreground">/ token</span></div>
                </div>
              </div>

              {/* Show a chart only when there are recorded trades, not just the launch reference price. */}
              {token.priceLabel !== 'Launch Reference Price' && (token.priceHistory?.length ?? 0) > 1 && (
                <div className="mb-3">
                  <div className="mb-2 text-[11px] font-semibold text-muted-foreground">
                    Recorded Trade History (ETH/token)
                  </div>
                  <ResponsiveContainer width="100%" height={56}>
                    <LineChart data={(token.priceHistory || []).map((item: any, idx: number) => typeof item === 'object' ? { v: Number(item.priceEth), time: item.time } : { v: item, time: `P${idx + 1}` })}>
                      <Tooltip
                        formatter={(v: any) => [formatEther(Number(v)), 'Price']}
                        labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.time || label}
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          fontSize: 11,
                          color: 'var(--foreground)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={token.change24h === null ? 'var(--muted-foreground)' : changeIsPositive ? 'var(--chart-3)' : 'var(--destructive)'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: token.change24h === null ? 'var(--muted-foreground)' : changeIsPositive ? 'var(--chart-3)' : 'var(--destructive)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href={`/investor-dashboard/marketInvestor/${token.campaignId}`}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-ring px-3 text-xs font-semibold text-ring transition-colors hover:bg-ring/10"
                >
                  Sell <ArrowUpRight size={13} />
                </Link>
                {token.contractAddress && (
                  <a
                    href={`https://sepolia.etherscan.io/token/${token.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-full border border-green-500/60 text-green-500 transition-colors hover:bg-green-500/10"
                    title="View on Etherscan"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl text-center px-16 py-16 text-muted-foreground">
          No tokens yet. Invest in campaigns to receive equity tokens.
        </div>
      )}

    </div>
  );
}
