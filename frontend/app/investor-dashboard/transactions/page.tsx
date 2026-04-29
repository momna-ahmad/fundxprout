//frontend/app/investor-dashboard/transactions/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Search, ExternalLink, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { formatCurrency, formatNumber, truncateHash, formatDate } from '@/lib/formatters';
import {
  getUserTransactions,
  filterTransactionsByType,
  filterTransactionsByStatus,
  searchTransactions,
  getTransactionStats,
} from '@/utils/supabase/getTransactions';

type TxType   = 'All' | 'Buy' | 'Sell' | 'Transfer' | 'Stake' | 'Dividend';
type TxStatus = 'All' | 'Confirmed' | 'Pending' | 'Failed';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Buy:      { bg: 'bg-green-500/10',         text: 'text-green-400'         },
  Sell:     { bg: 'bg-destructive/10',        text: 'text-destructive'       },
  Transfer: { bg: 'bg-white/6',              text: 'text-muted-foreground'  },
  Stake:    { bg: 'bg-[#6f42c1]/10',         text: 'text-[#a78bfa]'         },
  Dividend: { bg: 'bg-[var(--chart-4)]/10',  text: 'text-[var(--chart-4)]'  },
};

const STATUS_BADGE: Record<string, string> = {
  Confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  Pending:   'bg-[var(--chart-4)]/10 text-[var(--chart-4)] border-[var(--chart-4)]/25',
  Failed:    'bg-destructive/10 text-destructive border-destructive/20',
};

export default function TransactionsPage() {
  const [typeFilter,   setTypeFilter]   = useState<TxType>('All');
  const [statusFilter, setStatusFilter] = useState<TxStatus>('All');
  const [search,       setSearch]       = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats,        setStats]        = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError(null);
        const txs     = await getUserTransactions();
        const txStats = await getTransactionStats();
        setTransactions(txs);
        setStats(txStats);
      } catch {
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, []);

  let filtered = transactions;
  filtered = filterTransactionsByType(filtered, typeFilter);
  filtered = filterTransactionsByStatus(filtered, statusFilter);
  filtered = searchTransactions(filtered, search);

  const totalVolume   = stats?.totalVolume   || 0;
  const confirmed     = stats?.confirmedCount || 0;
  const dividendTotal = 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center text-muted-foreground pt-10">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center text-destructive pt-10">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3.5">
        {[
          { label: 'Total Volume',       value: formatCurrency(totalVolume),   sub: `${confirmed} confirmed txs`, accent: false },
          { label: 'Total Transactions', value: String(transactions.length),   sub: 'all time',                   accent: false },
          { label: 'Dividends Received', value: formatCurrency(dividendTotal), sub: 'from campaigns',             accent: true  },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl px-[22px] py-[18px]">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.05em] mb-2">{s.label}</div>
            <div className={`text-[26px] font-bold tracking-tight ${s.accent ? 'text-[#a78bfa]' : 'text-foreground'}`}>
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex gap-4 flex-wrap items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full bg-muted border border-border rounded-xl pl-[34px] pr-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Search hash or token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-muted-foreground flex-shrink-0" />
            {(['All', 'Buy', 'Sell', 'Transfer', 'Stake', 'Dividend'] as TxType[]).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  typeFilter === f
                    ? 'bg-[#6f42c1]/12 border-[#6f42c1]/40 text-[#a78bfa]'
                    : 'bg-white/3 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            {(['All', 'Confirmed', 'Pending', 'Failed'] as TxStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  statusFilter === f
                    ? 'bg-white/8 border-white/20 text-foreground'
                    : 'bg-white/3 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Tx Hash', 'Type', 'Token', 'Amount', 'Value (USD)', 'Date', 'Status', 'Explorer'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const typeStyle = TYPE_COLORS[tx.type] ?? TYPE_COLORS.Transfer;
                return (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#a78bfa]">{truncateHash(tx.hash)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#6f42c1]/20 flex items-center justify-center text-[9px] font-bold text-[#a78bfa] flex-shrink-0">
                          {tx.tokenSymbol.slice(0, 2)}
                        </div>
                        <span className="text-foreground font-semibold text-xs">{tx.tokenSymbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {tx.tokenAmount > 0 ? formatNumber(tx.tokenAmount) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-semibold ${tx.type === 'Dividend' ? 'text-green-400' : 'text-foreground'}`}>
                      {tx.type === 'Dividend' ? '+' : ''}{formatCurrency(tx.valueUSD)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.Failed}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-all">
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">No transactions found.</div>
        )}

        <div className="px-5 py-3 border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {transactions.length} transactions
          </span>
          <div className="flex gap-1.5">
            <button className="bg-muted text-foreground border border-border text-xs font-medium px-3.5 py-1.5 rounded-xl hover:bg-card transition-all">
              Previous
            </button>
            <button className="bg-[#6f42c1] hover:bg-[#5a3599] text-white text-xs font-medium px-3.5 py-1.5 rounded-xl transition-all">
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}