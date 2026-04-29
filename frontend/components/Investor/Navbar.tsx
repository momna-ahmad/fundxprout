// components/Investor/Navbar.tsx
'use client';
import { usePathname } from 'next/navigation';
import { Bell, Fuel, ChevronRight, Copy, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { useWallet } from '@/context/WalletContext';

// ── Page title map ───────────────────────────────────────────────────
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/investor-dashboard/overview':      { title: 'Overview',      subtitle: 'Your investment snapshot'          },
  '/investor-dashboard/portfolio':     { title: 'Portfolio',     subtitle: 'Token holdings & performance'      },
  '/investor-dashboard/campaigns':     { title: 'Campaigns',     subtitle: 'Investment campaigns'              },
  '/investor-dashboard/tokens':        { title: 'My Tokens',     subtitle: 'Equity token management'           },
  '/investor-dashboard/transactions':  { title: 'Transactions',  subtitle: 'Blockchain transaction history'    },
  '/investor-dashboard/settings':      { title: 'Settings',      subtitle: 'Account & preferences'            },
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Navbar() {
  const pathname = usePathname();
  const page     = pageTitles[pathname] ?? { title: 'Dashboard', subtitle: '' };

  // ── Theme (from the provider that IS in the component tree) ──
  const { theme, toggleTheme } = useTheme();

  // ── Wallet (from WalletProvider in dashboard layout) ──
  const { walletAddress, network, isConnecting, connectWallet } = useWallet();

  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Network label helper
  const networkLabel = () => {
    if (!walletAddress) return null;
    if (network === 11155111) return { text: 'Sepolia ✓', cls: 'text-[var(--chart-3)]', dot: 'bg-[var(--chart-3)]' };
    if (network)             return { text: 'Wrong Network', cls: 'text-destructive',       dot: 'bg-destructive'       };
    return                          { text: 'Checking…',    cls: 'text-muted-foreground',   dot: 'bg-muted-foreground'  };
  };
  const net = networkLabel();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-7 h-16 border-b border-border bg-background/90 backdrop-blur-xl">

      {/* ── Breadcrumb + page title ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] tracking-wide text-muted-foreground">FundXProut</span>
          <ChevronRight size={11} className="text-muted-foreground" />
          <span className="text-[11px] font-semibold text-ring">{page.title}</span>
        </div>
        <h1 className="text-[17px] font-bold leading-none tracking-tight text-foreground">
          {page.title}
        </h1>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-2">

        {/* Network badge — shown only when wallet connected */}
        {net && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted border border-border">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${net.dot}`}
              style={{ boxShadow: network === 11155111 ? '0 0 5px var(--chart-3)' : undefined }}
            />
            <span className={net.cls + ' font-medium'}>{net.text}</span>
          </div>
        )}

        {/* Gas fee — shown only on Sepolia */}
        {network === 11155111 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted border border-border text-muted-foreground">
            <Fuel size={12} style={{ color: 'var(--chart-4)' }} />
            <span className="font-semibold" style={{ color: 'var(--chart-4)' }}>24</span>
            <span>gwei</span>
          </div>
        )}

        {/* ── Theme toggle ── */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-muted border border-border text-muted-foreground hover:bg-card hover:text-foreground hover:border-ring transition-all duration-200 cursor-pointer"
        >
          <span
            className="absolute transition-all duration-300"
            style={{ opacity: theme === 'dark' ? 1 : 0, transform: theme === 'dark' ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(90deg)' }}
          >
            <Sun size={15} />
          </span>
          <span
            className="absolute transition-all duration-300"
            style={{ opacity: theme === 'light' ? 1 : 0, transform: theme === 'light' ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-90deg)' }}
          >
            <Moon size={15} />
          </span>
        </button>

        {/* ── Notifications ── */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-muted border border-border text-muted-foreground hover:bg-card hover:text-foreground hover:border-ring transition-all duration-200 cursor-pointer">
          <Bell size={15} />
          <span
            className="absolute top-[7px] right-[7px] w-1.5 h-1.5 rounded-full border border-background"
            style={{ background: 'var(--ring)', boxShadow: '0 0 5px var(--ring)' }}
          />
        </button>

        {/* ── Wallet pill / Connect button ── */}
        {walletAddress ? (
          <button
            onClick={copyAddress}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all duration-200 cursor-pointer"
            style={{
              background:  'color-mix(in srgb, var(--ring) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--ring) 30%, transparent)',
              color:       'var(--ring)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'color-mix(in srgb, var(--ring) 18%, transparent)';
              (e.currentTarget as HTMLButtonElement).style.borderColor  = 'color-mix(in srgb, var(--ring) 50%, transparent)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'color-mix(in srgb, var(--ring) 10%, transparent)';
              (e.currentTarget as HTMLButtonElement).style.borderColor  = 'color-mix(in srgb, var(--ring) 30%, transparent)';
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--ring), var(--chart-5))' }}
            />
            {truncateAddress(walletAddress)}
            <Copy size={11} />
            {copied && (
              <span className="font-sans font-semibold text-[10px]" style={{ color: 'var(--chart-3)' }}>
                Copied!
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer disabled:opacity-60"
            style={{
              background:  'color-mix(in srgb, var(--chart-5) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--chart-5) 35%, transparent)',
              color:       'var(--chart-5)',
            }}
          >
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}

      </div>
    </header>
  );
}