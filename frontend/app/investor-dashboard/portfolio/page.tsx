'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { formatCurrency, formatNumber, formatPercent, truncateAddress } from '@/lib/formatters';
import { getUserPortfolioData, getUserTokenHoldings } from '@/utils/supabase/getPortfolio';
import { Token } from '@/types';
import { calculateUserEquity } from '@/lib/equity/tokenEquity';

// ── Badge helper ─────────────────────────────────────────────────────
function Badge({
  children,
  variant = 'purple',
}: {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'purple' | 'amber';
}) {
  const cls: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-destructive/10 text-destructive border-destructive/20',
    amber:  'bg-[var(--chart-4)]/10 text-[var(--chart-4)] border-[var(--chart-4)]/20',
    purple: 'bg-[#6f42c1]/15 text-[#a78bfa] border-[#6f42c1]/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls[variant]}`}>
      {children}
    </span>
  );
}

export default function PortfolioPage() {
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [tokenHoldings, setTokenHoldings] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolioData() {
      try {
        setLoading(true);
        setError(null);
        const portfolio = await getUserPortfolioData();
        const holdings  = await getUserTokenHoldings();
        if (!portfolio) {
          setError('Unable to load portfolio data. Please log in.');
          return;
        }
        setPortfolioData(portfolio);
        setTokenHoldings(holdings);
      } catch {
        setError('Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
    }
    loadPortfolioData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center text-muted-foreground pt-10">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center text-destructive pt-10">{error || 'Portfolio data unavailable'}</div>
      </div>
    );
  }

  // Derive live ETH→USD rate from portfolio data (same approach as overview page)
  const ethPrice: number =
    (portfolioData.totalInvestedEth ?? 0) > 0
      ? (portfolioData.totalInvested ?? 0) / (portfolioData.totalInvestedEth ?? 1)
      : 3000;

  // totalValue: token holdings are already in USD (price = pricePerTokenEth × ethPrice)
  const totalValue = tokenHoldings.reduce((s: number, t: any) => s + t.value, 0) || portfolioData.portfolioValue;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Total portfolio value header ── */}
      <div
        className="bg-card border border-border rounded-2xl px-7 py-6"
        style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--chart-5) 8%, transparent) 0%, var(--card) 60%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] mb-1.5">
              Total Portfolio Value
            </div>
            <div className="text-[40px] font-bold tracking-tight text-foreground">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ≈ {(totalValue / ethPrice).toFixed(4)} ETH
            </div>
            <div className="flex items-center gap-2.5 mt-2">
              <Badge variant="green">
                <ArrowUpRight size={11} /> +{formatPercent(portfolioData.portfolioChangePercent || 0)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {tokenHoldings.length} active token positions
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground mb-1">Wallet</div>
            <div className="px-3.5 py-2 bg-[#6f42c1]/10 border border-[#6f42c1]/25 rounded-[10px] font-mono text-xs text-[#a78bfa]">
              {truncateAddress(portfolioData.walletAddress || '0x...', 10, 6)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Token Holdings Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Token Holdings</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Token', 'Balance', 'Price', 'Value (USD)', 'Equity %'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokenHoldings.map((token) => {
                const userEquityPct = calculateUserEquity(token);

                return (
                  <tr key={token.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white/8"
                          style={{ background: `linear-gradient(135deg, ${token.color}, rgba(0,0,0,0.4))` }}
                        >
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-foreground font-semibold text-[13px]">{token.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{token.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-semibold">{formatNumber(token.balance)}</div>
                      <div className="text-[11px] text-muted-foreground">{token.symbol}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-semibold">{formatCurrency(token.price, 2)}</div>
                      <div className="text-[11px] text-muted-foreground">{(token.price / ethPrice).toFixed(6)} ETH</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-bold text-sm">{formatCurrency(token.value)}</div>
                      <div className="text-[11px] text-muted-foreground">{(token.value / ethPrice).toFixed(4)} ETH</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-bold text-sm">{userEquityPct.toFixed(4)}%</div>
                    </td>
                  </tr>
                );
              })}
              {tokenHoldings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No holdings found in your portfolio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio allocation donut and monthly returns chart are temporarily disabled. */}

    </div>
  );
}
