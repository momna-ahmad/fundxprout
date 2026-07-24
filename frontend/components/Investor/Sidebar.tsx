// components/Investor/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, Briefcase, Coins,
  ArrowLeftRight, Settings, LogOut, Sprout, UserCircle, Store,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/investor-dashboard/overview',      label: 'Overview',      icon: LayoutDashboard },
  { href: '/investor-dashboard/portfolio',     label: 'Portfolio',     icon: Wallet          },
  { href: '/investor-dashboard/campaigns',     label: 'Investments',     icon: Briefcase       },
  { href: '/investor-dashboard/tokens',        label: 'My Tokens',     icon: Coins           },
  { href: '/investor-dashboard/marketplace',    label: 'Marketplace',   icon: Store           },
  { href: '/investor-dashboard/transactions',  label: 'Transactions',  icon: ArrowLeftRight  },
  { href: '/investor-dashboard/settings',      label: 'Settings',      icon: Settings        },
];

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { walletAddress, network, connectWallet, isConnecting } = useWallet();

  const networkOk = network === 11155111;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 z-50 w-[220px] flex flex-col bg-sidebar border-r border-sidebar-border">

      {/* ── Logo ── */}
      <div className="px-[18px] pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--ring), var(--chart-5))',
              boxShadow:  '0 4px 14px color-mix(in srgb, var(--ring) 45%, transparent)',
            }}
          >
            <Sprout size={17} color="#fff" />
          </div>
          <div>
            <div className="font-extrabold text-[14px] leading-tight text-sidebar-foreground tracking-tight">
              FundXProut
            </div>
            <div className="text-[9px] uppercase tracking-[0.07em] text-muted-foreground">
              Blockchain Platform
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-2.5 mb-2">
          Menu
        </p>
        <div className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`
                  group flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]
                  text-[13px] font-medium transition-all duration-150
                  ${active
                    ? 'text-sidebar-primary-foreground'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
                style={active ? {
                  background: 'color-mix(in srgb, var(--ring) 18%, transparent)',
                  border:     '1px solid color-mix(in srgb, var(--ring) 28%, transparent)',
                  color:      'var(--ring)',
                  fontWeight: 600,
                } : { border: '1px solid transparent' }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--ring)', boxShadow: '0 0 7px var(--ring)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Wallet / Profile section ── */}
      <div className="px-2.5 pb-4 pt-3 border-t border-sidebar-border flex flex-col gap-2">

        {/* Wallet status */}
        {walletAddress ? (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-semibold border"
            style={{
              background:  networkOk
                ? 'color-mix(in srgb, var(--chart-3) 8%, transparent)'
                : 'color-mix(in srgb, var(--destructive) 8%, transparent)',
              borderColor: networkOk
                ? 'color-mix(in srgb, var(--chart-3) 20%, transparent)'
                : 'color-mix(in srgb, var(--destructive) 20%, transparent)',
              color: networkOk ? 'var(--chart-3)' : 'var(--destructive)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: networkOk ? 'var(--chart-3)' : 'var(--destructive)',
                boxShadow:  networkOk ? '0 0 5px var(--chart-3)' : '0 0 5px var(--destructive)',
              }}
            />
            {networkOk ? 'Sepolia Connected' : network ? 'Wrong Network' : 'Wallet Connected'}
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[10px] text-[12px] font-semibold border transition-all duration-150 cursor-pointer disabled:opacity-60"
            style={{
              background:  'color-mix(in srgb, var(--chart-5) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--chart-5) 28%, transparent)',
              color:       'var(--chart-5)',
            }}
          >
            <Wallet size={13} />
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}

        {/* Profile card */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent border border-sidebar-border">
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--ring), var(--chart-5))' }}
          >
            <UserCircle size={16} color="#fff" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold leading-tight text-sidebar-foreground truncate">
              {walletAddress ? truncateAddress(walletAddress) : 'Not Connected'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {network === 11155111 ? 'Sepolia Testnet' : walletAddress ? `Chain ${network}` : 'MetaMask'}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="group flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[10px] text-[12px] font-medium text-muted-foreground bg-transparent border border-sidebar-border hover:text-destructive hover:border-destructive transition-all duration-150 cursor-pointer"
          style={{ '--hover-bg': 'color-mix(in srgb, var(--destructive) 8%, transparent)' } as React.CSSProperties}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--destructive) 8%, transparent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}