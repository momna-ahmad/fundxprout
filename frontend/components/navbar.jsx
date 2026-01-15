import { Wallet } from "lucide-react"
import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="fixed top-4 left-4 right-4 z-50 bg-white px-6 py-4 rounded-2xl shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-gray-900">FundXprout</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/homepage" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Home
          </Link>
          <Link href="#" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Campaigns
          </Link>
          <Link href="/create-campaign" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Create
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Dashboard
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-gray-900 hover:opacity-70">
            <Wallet className="h-5 w-5" />
          </Link>
          <Link href="/login" className="rounded-full bg-[#f6851b] hover:bg-[#e57a1a] px-6 py-2 text-sm font-semibold text-white transition duration-200">
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  )
}
