"use client"
import { useState } from "react"
import Link from "next/link"
import { Wallet, Eye, EyeOff } from "lucide-react"
import { useActionState } from 'react';
import { login  } from '@/lib/action';

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, formAction, isPending] = useActionState(
      login,
      undefined,
    );


  const handleWalletConnect = () => {
    // Handle MetaMask connection
    console.log("Connecting to MetaMask...")
  }

  return (
    <div className="min-h-screen bg-[#FFEEE0] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your FundXprout account</p>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#f6851b] hover:bg-[#e57a1a] text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleWalletConnect}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-[#6f42c1] hover:bg-[#5a3599] text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            <Wallet className="h-5 w-5" />
            Connect with MetaMask
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-[#f6851b] hover:text-[#e57a1a] font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  )
}