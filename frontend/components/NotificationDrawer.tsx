'use client';
// frontend/components/NotificationDrawer.tsx
// Slide-in notification drawer shown when the bell icon is clicked.

import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, X, Gavel, CheckCircle2, XCircle, TrendingUp, Clock, ShieldCheck, Building2, Rocket, AlertCircle } from 'lucide-react';
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
  const base = 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0';
  if (type === 'bid_received') return <div className={`${base} bg-violet-500/15`}><Gavel size={15} className="text-violet-400" /></div>;
  if (type === 'bid_accepted') return <div className={`${base} bg-emerald-500/15`}><CheckCircle2 size={15} className="text-emerald-400" /></div>;
  if (type === 'bid_cancelled' || type === 'bid_rejected') return <div className={`${base} bg-red-500/15`}><XCircle size={15} className="text-red-400" /></div>;
  if (type === 'trade_completed') return <div className={`${base} bg-amber-500/15`}><TrendingUp size={15} className="text-amber-400" /></div>;
  if (type === 'kyc_status') return <div className={`${base} bg-blue-500/15`}><ShieldCheck size={15} className="text-blue-400" /></div>;
  if (type === 'kyb_status') return <div className={`${base} bg-indigo-500/15`}><Building2 size={15} className="text-indigo-400" /></div>;
  if (type === 'campaign_approved') return <div className={`${base} bg-emerald-500/15`}><Rocket size={15} className="text-emerald-400" /></div>;
  if (type === 'campaign_rejected') return <div className={`${base} bg-rose-500/15`}><AlertCircle size={15} className="text-rose-400" /></div>;
  return <div className={`${base} bg-blue-500/15`}><Bell size={15} className="text-blue-400" /></div>;
}


type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
};

export default function NotificationDrawer({ notifications, unreadCount, onClose, onMarkAllRead, onMarkOneRead }: Props) {
  const router = useRouter();

  const handleClick = (notif: AppNotification) => {
    if (!notif.is_read) onMarkOneRead(notif.id);
    if (notif.link) { router.push(notif.link); onClose(); }
  };

  // Group by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.created_at).toDateString();
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Earlier';
    (groups[label] ??= []).push(n);
  }
  const groupOrder = ['Today', 'Yesterday', 'Earlier'].filter((g) => groups[g]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-4 top-16 z-50 w-[360px] max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-foreground" />
            <span className="text-sm font-bold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {unreadCount}
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
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Bell size={32} className="opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            groupOrder.map((group) => (
              <div key={group}>
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30">
                  {group}
                </p>
                {groups[group].map((notif) => (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(notif); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/40 last:border-0 ${
                      !notif.is_read ? 'bg-violet-500/5' : ''
                    }`}
                  >
                    <NotifIcon type={notif.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`block text-xs font-bold truncate ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Clock size={9} /> {timeAgo(notif.created_at)}
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
