'use client';
// frontend/app/investor-dashboard/marketplace/page.tsx
// Static token marketplace — investors can browse listings and simulate buy/sell trades

import { useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Search, TrendingUp,
  ArrowLeftRight, ChevronDown, Clock, CheckCircle2,
  XCircle, ShoppingCart, Tag,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
interface Listing {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  campaignIndustry: string;
  seller: string;
  amount: number;
  pricePerToken: number;
  totalValue: number;
  change24h: number;
  color: string;
  expiresIn: string;
}

interface Trade {
  id: string;
  type: 'Buy' | 'Sell';
  tokenSymbol: string;
  amount: number;
  pricePerToken: number;
  total: number;
  buyer: string;
  seller: string;
  timestamp: string;
  status: 'Confirmed' | 'Pending' | 'Failed';
}

// ── Static Mock Data ──────────────────────────────────────────────────
const listings: Listing[] = [
  {
    id: 'lst_001', tokenSymbol: 'GTE', tokenName: 'GreenTech Energy Token',
    campaignIndustry: 'Energy',    seller: '0x4A8f…5a', amount: 2500,
    pricePerToken: 4.35, totalValue: 10875, change24h: 5.2,
    color: '#F97316', expiresIn: '2d 14h',
  },
  {
    id: 'lst_002', tokenSymbol: 'MCH', tokenName: 'MediChain Health',
    campaignIndustry: 'Healthcare', seller: '0x7Bc3…1d', amount: 1800,
    pricePerToken: 7.60, totalValue: 13680, change24h: -1.8,
    color: '#FBB040', expiresIn: '5d 2h',
  },
  {
    id: 'lst_003', tokenSymbol: 'PVR', tokenName: 'PropVault Real Estate',
    campaignIndustry: 'Real Estate', seller: '0x2Ef9…3a', amount: 5000,
    pricePerToken: 3.10, totalValue: 15500, change24h: 11.3,
    color: '#EA6C00', expiresIn: '1d 7h',
  },
  {
    id: 'lst_004', tokenSymbol: 'AGF', tokenName: 'AgroFund Agriculture',
    campaignIndustry: 'Agriculture', seller: '0x9Cd4…2b', amount: 1200,
    pricePerToken: 9.45, totalValue: 11340, change24h: 3.7,
    color: '#C45500', expiresIn: '6d 20h',
  },
  {
    id: 'lst_005', tokenSymbol: 'FBL', tokenName: 'FinBridge Lending',
    campaignIndustry: 'Finance',    seller: '0x5Aa1…7f', amount: 800,
    pricePerToken: 12.10, totalValue: 9680, change24h: -0.4,
    color: '#8B3A00', expiresIn: '3d 11h',
  },
  {
    id: 'lst_006', tokenSymbol: 'CWA', tokenName: 'CleanWater Africa',
    campaignIndustry: 'Infrastructure', seller: '0x1Db6…4e', amount: 3300,
    pricePerToken: 2.20, totalValue: 7260, change24h: 0.8,
    color: '#6f42c1', expiresIn: '7d 0h',
  },
];

const recentTrades: Trade[] = [
  { id: 'tr_001', type: 'Buy',  tokenSymbol: 'GTE', amount: 500,  pricePerToken: 4.30, total: 2150,  buyer: '0x4A8f…5a', seller: '0x7Bc3…1d', timestamp: '2 min ago',  status: 'Confirmed' },
  { id: 'tr_002', type: 'Sell', tokenSymbol: 'AGF', amount: 300,  pricePerToken: 9.40, total: 2820,  buyer: '0x2Ef9…3a', seller: '0x4A8f…5a', timestamp: '8 min ago',  status: 'Confirmed' },
  { id: 'tr_003', type: 'Buy',  tokenSymbol: 'MCH', amount: 1000, pricePerToken: 7.55, total: 7550,  buyer: '0x9Cd4…2b', seller: '0x5Aa1…7f', timestamp: '15 min ago', status: 'Confirmed' },
  { id: 'tr_004', type: 'Buy',  tokenSymbol: 'FBL', amount: 200,  pricePerToken: 12.05, total: 2410, buyer: '0x4A8f…5a', seller: '0x1Db6…4e', timestamp: '31 min ago', status: 'Pending'   },
  { id: 'tr_005', type: 'Sell', tokenSymbol: 'PVR', amount: 750,  pricePerToken: 3.05, total: 2287,  buyer: '0x7Bc3…1d', seller: '0x4A8f…5a', timestamp: '1 hr ago',   status: 'Confirmed' },
  { id: 'tr_006', type: 'Buy',  tokenSymbol: 'CWA', amount: 400,  pricePerToken: 2.18, total: 872,   buyer: '0x5Aa1…7f', seller: '0x9Cd4…2b', timestamp: '2 hr ago',   status: 'Failed'    },
];

const marketStats = [
  { label: '24h Volume',     value: '$284,320',   change: '+18.4%', up: true  },
  { label: 'Active Listings', value: '47',         change: '+6 new', up: true  },
  { label: 'Trades Today',   value: '138',         change: '-4.2%',  up: false },
  { label: 'Avg Trade Size', value: '$3,210',      change: '+2.1%',  up: true  },
];

// ── Helpers ──────────────────────────────────────────────────────────
const fmt$  = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);
const fmtN  = (v: number) => new Intl.NumberFormat('en-US').format(v);

// ── Sub-components ───────────────────────────────────────────────────
function Badge({ children, color = 'purple' }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    amber:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-[#6f42c1]/15 text-[#a78bfa] border-[#6f42c1]/25',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls[color] ?? cls.purple}`}>
      {children}
    </span>
  );
}

function StatusIcon({ status }: { status: Trade['status'] }) {
  if (status === 'Confirmed') return <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />;
  if (status === 'Pending')   return <Clock        size={14} className="text-yellow-400 flex-shrink-0" />;
  return                             <XCircle      size={14} className="text-red-400 flex-shrink-0" />;
}

// ── Main Component ───────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch]         = useState('');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [sortBy, setSortBy]         = useState('volume');
  const [tradeModal, setTradeModal] = useState<{ open: boolean; listing: Listing | null; side: 'Buy' | 'Sell' }>({ open: false, listing: null, side: 'Buy' });
  const [tradeQty, setTradeQty]     = useState('');
  const [tradeSuccess, setTradeSuccess] = useState(false);

  const industries = ['All', ...Array.from(new Set(listings.map((l) => l.campaignIndustry)))];

  const filtered = listings
    .filter((l) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.tokenName.toLowerCase().includes(q) || l.tokenSymbol.toLowerCase().includes(q) || l.campaignIndustry.toLowerCase().includes(q);
      const matchIndustry = industryFilter === 'All' || l.campaignIndustry === industryFilter;
      return matchSearch && matchIndustry;
    })
    .sort((a, b) => {
      if (sortBy === 'price')  return b.pricePerToken - a.pricePerToken;
      if (sortBy === 'change') return Math.abs(b.change24h) - Math.abs(a.change24h);
      return b.totalValue - a.totalValue; // volume
    });

  const handleTrade = () => {
    setTradeSuccess(true);
    setTimeout(() => {
      setTradeSuccess(false);
      setTradeModal({ open: false, listing: null, side: 'Buy' });
      setTradeQty('');
    }, 2000);
  };

  const estimatedTotal = tradeModal.listing && tradeQty
    ? parseFloat(tradeQty) * tradeModal.listing.pricePerToken
    : 0;

  return (
    <div className="text-white flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div>
        <div className="text-[12px] text-[#a78bfa] font-semibold tracking-[0.08em] uppercase mb-1">
          Token Marketplace
        </div>
        <h1 className="text-[26px] font-black tracking-tight text-white">
          Trade Equity Tokens
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Buy and sell tokenized campaign equity with other investors
        </p>
      </div>

      {/* ── Market Stats ── */}
      <div className="grid grid-cols-4 gap-4">
        {marketStats.map((s) => (
          <div key={s.label} className="bg-card border border-white/5 rounded-2xl px-5 py-4 hover:border-[#6f42c1]/30 transition-all">
            <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] mb-2">{s.label}</div>
            <div className="text-2xl font-black text-white mb-1.5">{s.value}</div>
            <Badge color={s.up ? 'green' : 'red'}>
              {s.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {s.change}
            </Badge>
          </div>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tokens by name, symbol, or industry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent"
          />
        </div>

        <div className="relative">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="appearance-none bg-card border border-white/10 rounded-xl px-4 pr-8 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6f42c1] cursor-pointer"
          >
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind === 'All' ? 'All Industries' : ind}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none bg-card border border-white/10 rounded-xl px-4 pr-8 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6f42c1] cursor-pointer"
          >
            <option value="volume">Sort: Volume</option>
            <option value="price">Sort: Price</option>
            <option value="change">Sort: 24h Change</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Main Content: Listings + Trade History ── */}
      <div className="grid grid-cols-[1fr_340px] gap-5">

        {/* Token Listings */}
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em]">
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} available
          </div>

          {filtered.length === 0 && (
            <div className="bg-card border border-white/5 rounded-2xl py-12 text-center text-gray-500 text-sm">
              No listings match your search
            </div>
          )}

          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="bg-card border border-white/5 rounded-2xl px-6 py-5 hover:border-[#6f42c1]/35 transition-all duration-200"
            >
              <div className="flex items-center gap-4">

                {/* Token icon */}
                <div
                  className="w-[46px] h-[46px] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${listing.color}, rgba(0,0,0,0.5))`,
                    boxShadow:  `0 0 18px ${listing.color}33`,
                  }}
                >
                  {listing.tokenSymbol.slice(0, 2)}
                </div>

                {/* Name + seller */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[15px] font-bold text-white">{listing.tokenSymbol}</span>
                    <Badge color="purple">{listing.campaignIndustry}</Badge>
                  </div>
                  <div className="text-[12px] text-gray-400 truncate">{listing.tokenName}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5">Seller: {listing.seller}</div>
                </div>

                {/* Price + change */}
                <div className="text-right min-w-[90px]">
                  <div className="text-[16px] font-black text-white">{fmt$(listing.pricePerToken)}</div>
                  <Badge color={listing.change24h >= 0 ? 'green' : 'red'}>
                    {listing.change24h >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {listing.change24h >= 0 ? '+' : ''}{listing.change24h}%
                  </Badge>
                </div>

                {/* Amount + total */}
                <div className="text-right min-w-[100px]">
                  <div className="text-[13px] text-white font-semibold">{fmtN(listing.amount)} tokens</div>
                  <div className="text-[11px] text-gray-400">{fmt$(listing.totalValue)} total</div>
                </div>

                {/* Expiry */}
                <div className="text-right min-w-[70px]">
                  <div className="flex items-center gap-1 justify-end text-[11px] text-gray-500">
                    <Clock size={11} />
                    <span>{listing.expiresIn}</span>
                  </div>
                  <div className="text-[10px] text-gray-600">expires</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setTradeModal({ open: true, listing, side: 'Buy' })}
                    className="bg-[#6f42c1] hover:bg-[#5a3599] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
                  >
                    <ShoppingCart size={13} /> Buy
                  </button>
                  <button
                    onClick={() => setTradeModal({ open: true, listing, side: 'Sell' })}
                    className="border border-white/10 text-gray-300 hover:text-white hover:border-white/25 text-xs font-semibold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
                  >
                    <Tag size={13} /> Sell
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trade History sidebar */}
        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden self-start sticky top-4">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] flex items-center gap-2">
              <ArrowLeftRight size={13} />
              Recent Trades
            </div>
            <Badge color="purple">{recentTrades.length} trades</Badge>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {recentTrades.map((trade) => (
              <div key={trade.id} className="px-5 py-3.5 flex items-center gap-3">
                <StatusIcon status={trade.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[12px] font-bold ${trade.type === 'Buy' ? 'text-green-400' : 'text-[#a78bfa]'}`}>
                      {trade.type}
                    </span>
                    <span className="text-[12px] text-white font-semibold">{trade.tokenSymbol}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{fmtN(trade.amount)} @ {fmt$(trade.pricePerToken)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-white">{fmt$(trade.total)}</div>
                  <div className="text-[10px] text-gray-600">{trade.timestamp}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Book hint */}
          <div className="px-5 py-4 border-t border-white/5">
            <div className="text-[11px] text-gray-500 uppercase tracking-[0.05em] mb-3 flex items-center gap-2">
              <TrendingUp size={13} />
              Live Order Book
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] mb-1">
              <span className="text-gray-500">Bids</span>
              <span className="text-gray-500 text-right">Asks</span>
            </div>
            {[
              ['4.32', '1,200', '4.36', '800'],
              ['4.28', '3,500', '4.40', '1,500'],
              ['4.25', '2,100', '4.45', '600'],
            ].map(([bid, bQty, ask, aQty], i) => (
              <div key={i} className="grid grid-cols-2 gap-1 text-[11px] mb-0.5">
                <div className="flex justify-between">
                  <span className="text-green-400 font-mono">${bid}</span>
                  <span className="text-gray-600">{bQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{aQty}</span>
                  <span className="text-red-400 font-mono">${ask}</span>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 mt-2 text-center">GTE order book sample</p>
          </div>
        </div>
      </div>

      {/* ── Trade Modal ── */}
      {tradeModal.open && tradeModal.listing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2030] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">

            {tradeSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">
                  {tradeModal.side} Order Placed!
                </h3>
                <p className="text-gray-400 text-sm">
                  Your order is being processed on-chain
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-[42px] h-[42px] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${tradeModal.listing.color}, rgba(0,0,0,0.5))` }}
                  >
                    {tradeModal.listing.tokenSymbol.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-white">
                      {tradeModal.side} {tradeModal.listing.tokenSymbol}
                    </h3>
                    <p className="text-[12px] text-gray-400">{tradeModal.listing.tokenName}</p>
                  </div>
                  <button
                    onClick={() => { setTradeModal({ open: false, listing: null, side: 'Buy' }); setTradeQty(''); }}
                    className="ml-auto text-gray-500 hover:text-white transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Price info */}
                <div className="bg-black/20 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-[11px] mb-0.5">Price per token</p>
                    <p className="text-white font-bold">{fmt$(tradeModal.listing.pricePerToken)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[11px] mb-0.5">Available</p>
                    <p className="text-white font-bold">{fmtN(tradeModal.listing.amount)} tokens</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[11px] mb-0.5">24h Change</p>
                    <p className={`font-bold ${tradeModal.listing.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tradeModal.listing.change24h >= 0 ? '+' : ''}{tradeModal.listing.change24h}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[11px] mb-0.5">Industry</p>
                    <p className="text-[#a78bfa] font-semibold">{tradeModal.listing.campaignIndustry}</p>
                  </div>
                </div>

                {/* Quantity input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity (tokens)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={tradeModal.listing.amount}
                    value={tradeQty}
                    onChange={(e) => setTradeQty(e.target.value)}
                    placeholder={`Max ${fmtN(tradeModal.listing.amount)}`}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] text-sm"
                  />
                </div>

                {/* Estimated total */}
                {estimatedTotal > 0 && (
                  <div className="bg-[#6f42c1]/10 border border-[#6f42c1]/25 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Estimated Total</span>
                    <span className="text-white font-black text-lg">{fmt$(estimatedTotal)}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setTradeModal({ open: false, listing: null, side: 'Buy' }); setTradeQty(''); }}
                    className="flex-1 border border-white/10 text-gray-300 hover:text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTrade}
                    disabled={!tradeQty || parseFloat(tradeQty) <= 0 || parseFloat(tradeQty) > tradeModal.listing.amount}
                    className={`flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      tradeModal.side === 'Buy'
                        ? 'bg-[#6f42c1] hover:bg-[#5a3599]'
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    Confirm {tradeModal.side}
                  </button>
                </div>

                <p className="text-[11px] text-gray-600 text-center mt-3">
                  Trades are executed on Sepolia testnet. Connect your wallet to proceed.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
