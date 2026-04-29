'use client';
// frontend/app/investor-dashboard/settings/page.tsx
// Dynamic investor profile & settings — reads/writes to Supabase profiles table

import { useState, useEffect, useRef } from 'react';
import {
  Shield, Bell, Key, User, Wallet, CheckCircle, AlertCircle,
  Copy, Plus, Trash2, Pencil, Save, X, Loader2, Check,
  Globe, Phone, MapPin, FileText, Lock,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  getMyProfile, calcProfileCompletion,
  updateProfile, updateNotificationPrefs,
} from '@/utils/supabase/getProfile';
import { truncateAddress } from '@/lib/formatters';
import { useWallet } from '@/context/WalletContext';

// ── Types ────────────────────────────────────────────────────────────
interface Profile {
  full_name?: string;
  display_name?: string;
  bio?: string;
  phone?: string;
  country?: string;
  website_url?: string;
  wallet_address?: string;
  role?: string;
  notification_prefs?: Record<string, boolean>;
  [key: string]: any;
}

// ── Tier derived from KYC docs ───────────────────────────────────────
function deriveTier(profile: Profile | null): 'Retail' | 'Accredited' {
  if (!profile) return 'Retail';
  const hasKyc =
    profile.national_id_cid && profile.selfie_cid && profile.proof_of_address_cid;
  return hasKyc ? 'Accredited' : 'Retail';
}

function deriveKycStatus(profile: Profile | null): 'Verified' | 'Pending' | 'Not Started' {
  if (!profile) return 'Not Started';
  if (profile.national_id_cid && profile.selfie_cid) return 'Verified';
  if (profile.national_id_cid || profile.selfie_cid)  return 'Pending';
  return 'Not Started';
}

const DEFAULT_NOTIF = {
  dividends: true, campaigns: true, priceAlerts: false, security: true, newsletter: false,
};

// ── Sub-components ────────────────────────────────────────────────────
function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: string }) {
  const cls: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-destructive/10 text-destructive border-destructive/20',
    amber:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    purple: 'bg-[#6f42c1]/10 text-[#a78bfa] border-[#6f42c1]/25',
    gray:   'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls[variant] ?? cls.gray}`}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} aria-label="toggle" />
      <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${checked ? 'bg-[#6f42c1]' : 'bg-muted border border-border'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className="text-[#6f42c1] flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Inline field editor ──────────────────────────────────────────────
function EditableField({
  label, value, placeholder, multiline = false, icon: Icon,
  onSave,
}: {
  label: string; value: string; placeholder: string; multiline?: boolean;
  icon?: React.ElementType; onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // keep draft in sync if parent value changes
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const startEdit = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 50); };
  const cancel    = () => { setDraft(value); setEditing(false); };

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const sharedCls = 'w-full bg-black/20 border border-[#6f42c1]/40 rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6f42c1]';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && <Icon size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.05em] mb-1">{label}</div>
        {editing ? (
          multiline ? (
            <textarea
              ref={ref as any}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={placeholder}
              className={sharedCls + ' resize-none'}
            />
          ) : (
            <input
              ref={ref as any}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className={sharedCls}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
          )
        ) : (
          <div className="text-[14px] text-foreground font-medium min-h-[20px]">
            {value || <span className="text-muted-foreground italic text-[13px]">{placeholder}</span>}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={saving}
              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
            <button onClick={cancel} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all">
              <X size={14} />
            </button>
          </>
        ) : (
          <button onClick={startEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            {saved ? <Check size={14} className="text-green-400" /> : <Pencil size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function SettingsPage() {
  const { walletAddress, network } = useWallet();

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [authEmail, setAuthEmail]   = useState<string>('');
  const [authUserId, setAuthUserId] = useState<string>('');
  const [loading, setLoading]       = useState(true);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIF);
  const [twoFA, setTwoFA]           = useState(true);
  const [pwModal, setPwModal]       = useState(false);
  const [copyDone, setCopyDone]     = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSaved,  setGlobalSaved]  = useState(false);

  // Password change state
  const [pwFields, setPwFields] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError]   = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone]     = useState(false);

  // Load profile + auth user on mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthEmail(user.email ?? '');
          setAuthUserId(user.id ?? '');
        }
        const prof = await getMyProfile();
        setProfile(prof ?? {});
        if (prof?.notification_prefs) {
          setNotifications({ ...DEFAULT_NOTIF, ...prof.notification_prefs });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Field-level save helpers ─────────────────────────────────────────
  const saveField = async (field: keyof Profile, value: string) => {
    const result = await updateProfile({ [field]: value });
    if (!result.error) setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // ── Notification save ────────────────────────────────────────────────
  const toggleNotif = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    await updateNotificationPrefs(updated);
  };

  // ── Password change ──────────────────────────────────────────────────
  const changePassword = async () => {
    setPwError('');
    if (pwFields.next.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (pwFields.next !== pwFields.confirm) { setPwError('Passwords do not match'); return; }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwFields.next });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwDone(true);
    setTimeout(() => { setPwModal(false); setPwDone(false); setPwFields({ current: '', next: '', confirm: '' }); }, 1500);
  };

  // ── Copy wallet address ──────────────────────────────────────────────
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 1500);
    });
  };

  // ── Derived values ───────────────────────────────────────────────────
  const fullName   = profile?.full_name   ?? '';
  const initials   = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : authEmail.slice(0, 2).toUpperCase();

  const tier       = deriveTier(profile);
  const kycStatus  = deriveKycStatus(profile);
  const completion = calcProfileCompletion(profile);
  const tierBadge  = tier === 'Accredited' ? 'amber' : 'gray';
  const joinDate   = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // Effective wallet: from chain context (MetaMask) or saved in profile
  const effectiveWallet = walletAddress ?? profile?.wallet_address ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[860px]">

      {/* ── Profile Information ── */}
      <SectionCard icon={User} title="Profile Information">

        {/* Avatar + header */}
        <div className="flex items-center gap-[18px] mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6f42c1] to-[#a78bfa] flex items-center justify-center text-[22px] font-bold text-white flex-shrink-0 shadow-[0_0_24px_rgba(111,66,193,0.45)] select-none">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-foreground mb-0.5">{fullName || authEmail || 'Investor'}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] text-muted-foreground">{authEmail}</span>
              <Badge variant={tierBadge}>{tier} Investor</Badge>
            </div>
          </div>
        </div>

        {/* Profile completion bar */}
        <div className="mb-5 px-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Profile completion</span>
            <span className="text-[#a78bfa] font-semibold">{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] transition-[width] duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Editable fields */}
        <div className="divide-y divide-border">
          <EditableField
            label="Full Name" placeholder="Enter your full name"
            value={profile?.full_name ?? ''} icon={User}
            onSave={(v) => saveField('full_name', v)}
          />
          <EditableField
            label="Display Name" placeholder="How you appear to others"
            value={profile?.display_name ?? ''}
            onSave={(v) => saveField('display_name', v)}
          />
          <EditableField
            label="Bio" placeholder="Tell other investors about yourself"
            value={profile?.bio ?? ''} multiline icon={FileText}
            onSave={(v) => saveField('bio', v)}
          />
          <EditableField
            label="Phone" placeholder="+1 555 000 0000"
            value={profile?.phone ?? ''} icon={Phone}
            onSave={(v) => saveField('phone', v)}
          />
          <EditableField
            label="Country" placeholder="e.g. United States"
            value={profile?.country ?? ''} icon={MapPin}
            onSave={(v) => saveField('country', v)}
          />
          <EditableField
            label="Website / LinkedIn" placeholder="https://..."
            value={profile?.website_url ?? ''} icon={Globe}
            onSave={(v) => saveField('website_url', v)}
          />
        </div>

        {/* Static info cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Member Since', value: joinDate,   mono: false },
            { label: 'Investor ID',  value: authUserId ? authUserId.slice(0, 12) + '…' : '—', mono: true },
            { label: 'KYC Status',   value: kycStatus,  kyc: true   },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3.5 bg-black/25 border border-border rounded-xl">
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-1.5">{s.label}</div>
              {s.kyc ? (
                <Badge variant={kycStatus === 'Verified' ? 'green' : kycStatus === 'Pending' ? 'amber' : 'red'}>
                  {kycStatus === 'Verified' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                  {kycStatus}
                </Badge>
              ) : (
                <div className={`text-[13px] text-foreground font-semibold ${s.mono ? 'font-mono text-[11px]' : ''}`}>
                  {s.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Connected Wallets ── */}
      <SectionCard icon={Wallet} title="Connected Wallets">
        <div className="flex flex-col gap-2.5">
          {effectiveWallet ? (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#6f42c1]/30 bg-black/20">
              <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#6f42c1] to-[#a78bfa]">
                <Wallet size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[13px] text-foreground">{truncateAddress(effectiveWallet, 10, 6)}</span>
                  <Badge variant="purple">Primary</Badge>
                  {network === 11155111 && <Badge variant="green">Sepolia ✓</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="gray">Ethereum</Badge>
                  <span className="text-xs text-muted-foreground">MetaMask</span>
                </div>
              </div>
              <button
                onClick={() => copyAddress(effectiveWallet)}
                className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-all"
                title="Copy address"
              >
                {copyDone ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-sm">
              No wallet connected — use the sidebar to connect MetaMask
            </div>
          )}

          {/* Wallet address field — save to profile */}
          <div className="mt-1">
            <EditableField
              label="Saved Wallet Address (profile)"
              placeholder="0x... — saved for reference"
              value={profile?.wallet_address ?? ''}
              icon={Wallet}
              onSave={(v) => saveField('wallet_address', v)}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Notification Preferences ── */}
      <SectionCard icon={Bell} title="Notification Preferences">
        <div className="flex flex-col gap-0">
          {([
            { key: 'dividends',   label: 'Dividend Payments',   desc: 'When dividends are credited to your account'      },
            { key: 'campaigns',   label: 'Campaign Updates',    desc: 'Status changes and milestones for your campaigns'  },
            { key: 'priceAlerts', label: 'Token Price Alerts',  desc: 'When a token price moves more than 10%'             },
            { key: 'security',    label: 'Security Alerts',     desc: 'Login attempts and wallet activity'                },
            { key: 'newsletter',  label: 'Platform Newsletter', desc: 'Weekly digest and new investment opportunities'     },
          ] as const).map((item) => (
            <div key={item.key} className="flex items-center gap-3.5 py-3.5 border-b border-border last:border-0">
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-foreground mb-0.5">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Toggle
                checked={notifications[item.key]}
                onChange={() => toggleNotif(item.key)}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Security ── */}
      <SectionCard icon={Shield} title="Security">
        <div className="flex flex-col gap-3">

          {/* 2FA row */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-black/20 border border-border rounded-xl">
            <div className="flex items-center gap-2.5">
              <Key size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <div className="text-[13px] font-semibold text-foreground">Two-Factor Authentication</div>
                <div className="text-xs text-muted-foreground">Authenticator app (TOTP)</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge variant={twoFA ? 'green' : 'red'}>{twoFA ? 'Enabled' : 'Disabled'}</Badge>
              <Toggle checked={twoFA} onChange={() => setTwoFA(!twoFA)} />
            </div>
          </div>

          {/* Active sessions */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-black/20 border border-border rounded-xl">
            <div>
              <div className="text-[13px] font-semibold text-foreground">Active Sessions</div>
              <div className="text-xs text-muted-foreground">1 active session • Current browser</div>
            </div>
            <button className="bg-muted text-destructive border border-destructive/20 text-xs font-medium px-3 py-1.5 rounded-xl hover:bg-destructive/10 transition-all">
              Revoke All
            </button>
          </div>

          {/* Change password */}
          <div className="flex justify-end">
            <button
              onClick={() => setPwModal(true)}
              className="flex items-center gap-1.5 text-[#a78bfa] text-xs font-medium hover:underline bg-transparent border-0 cursor-pointer"
            >
              <Lock size={13} /> Change Password
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── Password Change Modal ── */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2030] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">

            {pwDone ? (
              <div className="text-center py-6">
                <Check size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-white font-bold">Password updated!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                    <Lock size={16} className="text-[#6f42c1]" /> Change Password
                  </h3>
                  <button onClick={() => { setPwModal(false); setPwError(''); setPwFields({ current: '', next: '', confirm: '' }); }}
                    className="text-gray-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                  {(['current', 'next', 'confirm'] as const).map((field, i) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        {field === 'current' ? 'Current Password' : field === 'next' ? 'New Password' : 'Confirm New Password'}
                      </label>
                      <input
                        type="password"
                        value={pwFields[field]}
                        onChange={(e) => setPwFields((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={field === 'next' ? 'Min. 8 characters' : ''}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6f42c1]"
                      />
                    </div>
                  ))}
                  {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setPwModal(false); setPwError(''); setPwFields({ current: '', next: '', confirm: '' }); }}
                    className="flex-1 border border-white/10 text-gray-300 text-sm font-medium py-2.5 rounded-xl hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={changePassword}
                    disabled={pwSaving}
                    className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {pwSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Update Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
