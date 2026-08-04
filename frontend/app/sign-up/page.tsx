'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/action';
import GoogleSignIn from "@/components/google-signIn";

const initialState = { error: '', success: '' };

export default function Page() {
  const router = useRouter();
  const [state, formAction] = useActionState(signup, initialState);

  useEffect(() => {
    if (!state?.success) return;

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [router, state?.success]);

  return (
    <div className="min-h-screen bg-[#181A2A] flex items-center justify-center px-4">
      <div className="bg-[#1a2030] border border-white/5 rounded-3xl p-8 w-full max-w-md shadow-xl">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
          <p className="text-gray-400 text-sm">Join FundXprout and start your journey</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              id="email"
              className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              name="password"
              type="password"
              id="password"
              className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
              placeholder="••••••••"
            />
          </div>

          {state?.success && (
            <p className="text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
              {state.success}
            </p>
          )}

          {state?.error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-[#6f42c1] hover:bg-[#5a3599] text-white font-bold py-3 px-4 rounded-full transition duration-200 text-sm"
          >
            Sign Up
          </button>
        </form>

        <div className="my-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-[#1a2030] text-gray-500">Or continue with</span>
          </div>
        </div>

        <GoogleSignIn />

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#a78bfa] hover:text-white font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}