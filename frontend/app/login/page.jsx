'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useActionState } from 'react';
import { login } from '@/lib/action';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import GoogleSignIn from "@/components/google-signIn";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, formAction, isPending] = useActionState(login, undefined);

  const handleWalletConnect = () => {
    console.log("Connecting to MetaMask...");
  };

  return (
    <div className="min-h-screen bg-[#181A2A] flex items-center justify-center px-4">
      <div className="bg-[#1a2030] border border-white/5 rounded-3xl p-8 w-full max-w-md shadow-xl">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400 text-sm">Sign in to your FundXprout account</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition duration-200 text-sm"
          >
            {isPending ? "Signing in..." : "Sign In"}
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

        <button
          onClick={handleWalletConnect}
          className="w-full flex items-center justify-center gap-3 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa] font-semibold py-3 px-4 rounded-full transition duration-200 text-sm mb-4"
        >
          <Wallet className="h-4 w-4" />
          Connect with MetaMask
        </button>

        <GoogleSignIn />

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-[#a78bfa] hover:text-white font-semibold transition-colors">
              Sign up
            </Link>
          </p>
          <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-gray-300 transition-colors block">
            Forgot your password?
          </Link>
        </div>

      </div>
    </div>
  );
}