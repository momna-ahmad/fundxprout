'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthenticateAction } from '@/lib/action';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!secretKey.trim()) {
      toast.error('Admin Secret Key is required.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Authenticating admin portal access…');

    try {
      const res = await adminAuthenticateAction(email, secretKey, password);

      if (res?.error) {
        toast.error(res.error, { id: toastId });
      } else {
        toast.success('Admin authentication successful! Access granted.', { id: toastId });
        router.push('/admin-dashboard');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4 sm:p-6" style={{ color: '#f8fafc' }}>
      {/* Back button */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          style={{ color: '#94a3b8' }}
        >
          <ArrowLeft size={14} /> Back to FundXProut
        </Link>
      </div>

      {/* Main Admin Card */}
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151c2c] p-8 shadow-2xl backdrop-blur-xl">
        {/* Shield Icon Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center mb-4 text-[#a78bfa] shadow-inner">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#ffffff' }}>
            Admin Portal Login
          </h1>
          <p className="mt-1.5 text-xs" style={{ color: '#94a3b8' }}>
            Authorized personnel only. Authenticate with master credentials and secret passcode.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>
              Admin Account Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="admin@fundxprout.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-[#0b0f19] pl-11 pr-4 py-3 text-sm outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition"
                style={{ color: '#ffffff', backgroundColor: '#0b0f19' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#cbd5e1' }}>
              Account Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-[#0b0f19] pl-11 pr-4 py-3 text-sm outline-none focus:border-[#a78bfa] focus:ring-1 focus:ring-[#a78bfa] transition"
                style={{ color: '#ffffff', backgroundColor: '#0b0f19' }}
              />
            </div>
          </div>

          {/* Admin Secret Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#c084fc' }}>
                Secret Admin Passcode
              </label>
            </div>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="password"
                required
                placeholder="Enter secret passcode"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full rounded-2xl border border-[#a78bfa]/40 bg-[#0b0f19] pl-11 pr-4 py-3 text-sm outline-none focus:border-[#a78bfa] focus:ring-2 focus:ring-[#a78bfa]/20 transition"
                style={{ color: '#ffffff', backgroundColor: '#0b0f19' }}
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-2xl py-3.5 text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#a78bfa]/20"
            style={{ background: 'linear-gradient(135deg, #6f42c1, #a78bfa)', color: '#ffffff' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Authenticating…
              </>
            ) : (
              'Authenticate Admin Access'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-[11px]" style={{ color: '#64748b' }}>
            FundXProut Governance &amp; Administration Security Subsystem
          </p>
        </div>
      </div>
    </div>
  );
}
