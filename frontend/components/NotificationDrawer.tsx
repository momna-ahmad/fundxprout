'use client';
// frontend/components/NotificationDrawer.tsx
// Theme-adaptive Notification UI (Light & Dark Mode compatible with React Portal):
// Mode 1: Compact Quick Unread Dropdown (floating under top header bell icon).
// Mode 2: Full-Height Solid Vertical Side Drawer (fixed right panel with solid backdrop, search, categories, date groupings).

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  Bell, CheckCheck, X, Gavel, CheckCircle2, XCircle, 
  TrendingUp, Clock, ShieldCheck, Building2, Rocket, 
  AlertCircle, Search, Filter, Sparkles, Maximize2, ArrowLeft
} from 'lucide-react';
import { type AppNotification } from '@/hooks/useNotifications';

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

function NotifIcon({ type }: { type: string }) {
  const base = 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors';
  if (type === 'bid_received' || type === 'bid_placed') 
    return <div className={`${base} bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400`}><Gavel size={16} /></div>;
  if (type === 'bid_accepted') 
    return <div className={`${base} bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400`}><CheckCircle2 size={16} /></div>;
  if (type === 'bid_cancelled' || type === 'bid_rejected') 
    return <div className={`${base} bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400`}><XCircle size={16} /></div>;
  if (type === 'trade_completed') 
    return <div className={`${base} bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400`}><TrendingUp size={16} /></div>;
  if (type === 'kyc_status') 
    return <div className={`${base} bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400`}><ShieldCheck size={16} /></div>;
  if (type === 'kyb_status') 
    return <div className={`${base} bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400`}><Building2 size={16} /></div>;
  if (type === 'campaign_approved') 
    return <div className={`${base} bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400`}><Rocket size={16} /></div>;
  if (type === 'campaign_rejected') 
    return <div className={`${base} bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400`}><AlertCircle size={16} /></div>;
  return <div className={`${base} bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400`}><Bell size={16} /></div>;
}

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
};

type FilterCategory = 'all' | 'unread' | 'bids' | 'campaigns' | 'verification';

export default function NotificationDrawer({ 
  notifications, 
  unreadCount, 
  onClose, 
  onMarkAllRead, 
  onMarkOneRead 
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleClick = (notif: AppNotification) => {
    if (!notif.is_read) onMarkOneRead(notif.id);
    if (notif.link) { 
      router.push(notif.link); 
      onClose(); 
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: COMPACT FLOATING DROPDOWN (Image 2 Style - Floating under Navbar)
  // ─────────────────────────────────────────────────────────────
  if (!isExpanded) {
    return createPortal(
      <>
        {/* Transparent backdrop to click away */}
        <div className="fixed inset-0 z-[9998] bg-transparent" onClick={onClose} />

        {/* Compact Floating Solid Card */}
        <div className="fixed right-6 top-16 z-[9999] w-[360px] sm:w-[380px] max-h-[82vh] flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/60">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 leading-none shadow-sm">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Unread List */}
          <div className="overflow-y-auto flex-1 divide-y divide-border/50 bg-card">
            {unreadNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground gap-2">
                <CheckCircle2 size={32} className="text-emerald-500 opacity-80" />
                <p className="text-sm font-medium text-foreground">No unread notifications</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  You&apos;re all caught up! Click below to view your full history of previous notifications.
                </p>
              </div>
            ) : (
              unreadNotifications.slice(0, 15).map((notif) => (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClick(notif)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(notif); }}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors bg-violet-500/10 hover:bg-violet-500/20 border-l-2 border-l-violet-500"
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-xs font-bold text-foreground truncate">
                        {notif.title}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 animate-pulse" />
                    </div>
                    <span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1 font-medium">
                      <Clock size={9} /> {timeAgo(notif.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Expand Footer Action */}
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-muted/80 hover:bg-muted text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold text-xs border-t border-border transition-colors"
          >
            <Maximize2 size={13} /> View All Notifications & History ({notifications.length}) →
          </button>
        </div>
      </>,
      document.body
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: EXPANDED VERTICAL RIGHT SIDE PANEL (100% Solid Opaque Background)
  // ─────────────────────────────────────────────────────────────
  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread' && notif.is_read) return false;
    if (activeTab === 'bids' && !['bid_received', 'bid_placed', 'bid_accepted', 'bid_rejected', 'bid_cancelled', 'trade_completed'].includes(notif.type)) return false;
    if (activeTab === 'campaigns' && !['campaign_approved', 'campaign_rejected', 'campaign_failed'].includes(notif.type)) return false;
    if (activeTab === 'verification' && !['kyc_status', 'kyb_status'].includes(notif.type)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return notif.title.toLowerCase().includes(q) || notif.message.toLowerCase().includes(q);
    }
    return true;
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, AppNotification[]> = {};
  for (const n of filteredNotifications) {
    const d = new Date(n.created_at).toDateString();
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Earlier';
    (groups[label] ??= []).push(n);
  }
  const groupOrder = ['Today', 'Yesterday', 'Earlier'].filter((g) => groups[g]);

  return createPortal(
    <>
      {/* Dimmed Solid Backdrop Overlay */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Vertical Solid Right Side Panel */}
      <aside className="fixed right-0 top-0 bottom-0 z-[9999] w-full sm:w-[450px] md:w-[480px] h-screen flex flex-col border-l border-border bg-card text-card-foreground shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Back to quick view"
            >
              <ArrowLeft size={14} /> Quick View
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 leading-none">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Viewing activity & updates history</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-600 dark:text-violet-300 hover:bg-violet-500/30 transition-colors"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="p-5 border-b border-border bg-muted/30 space-y-3.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All', icon: Sparkles },
              { id: 'unread', label: `Unread (${unreadCount})`, icon: Filter },
              { id: 'bids', label: 'Bids & Trading', icon: Gavel },
              { id: 'campaigns', label: 'Campaigns', icon: Rocket },
              { id: 'verification', label: 'KYC & Safety', icon: ShieldCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterCategory)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Notifications List */}
        <div className="overflow-y-auto flex-1 divide-y divide-border/40 bg-card">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Bell size={24} className="opacity-40 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No notifications found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery 
                    ? `No matches for "${searchQuery}"` 
                    : activeTab === 'unread' 
                    ? "You've read all your notifications!" 
                    : 'Activity and updates will appear here.'}
                </p>
              </div>
              {(searchQuery || activeTab !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                  className="mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            groupOrder.map((group) => (
              <div key={group} className="bg-card">
                <div className="sticky top-0 z-10 px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/90 backdrop-blur-md border-y border-border">
                  {group}
                </div>
                {groups[group].map((notif) => (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(notif); }}
                    className={`w-full flex items-start gap-4 px-6 py-4 text-left cursor-pointer transition-all duration-200 border-b border-border/40 last:border-0 ${
                      !notif.is_read 
                        ? 'bg-violet-500/10 border-l-4 border-l-violet-500 hover:bg-violet-500/15' 
                        : 'hover:bg-muted/50 bg-card'
                    }`}
                  >
                    <NotifIcon type={notif.type} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`block text-xs font-bold truncate ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 animate-pulse" />
                        )}
                      </div>

                      <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                        {notif.message}
                      </span>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={10} /> {timeAgo(notif.created_at)}
                        </span>
                        {notif.link && (
                          <span className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                            View details →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredNotifications.length}</strong> of{' '}
            <strong className="text-foreground">{notifications.length}</strong> notifications
          </span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-violet-600 dark:text-violet-400 hover:underline font-semibold transition-colors"
          >
            ← Quick Unread View
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
