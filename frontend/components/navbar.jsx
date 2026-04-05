"use client"
import { Wallet } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Navbar() {
	return (
		<nav className="w-full bg-[#181A2A] px-12 py-6 flex items-center justify-between">
			{/* Logo */}
			<Link href="/" className="flex items-center gap-2">
				<Image src="/logo.png" alt="FundXProut Logo" width={36} height={36} className="rounded-full" />
				<span className="text-2xl font-bold text-white">FundXprout</span>
			</Link>

        {/* Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/homepage" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Home
          </Link>
          <Link href="/get-campaigns" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Campaigns
          </Link>
          <Link href="/create-campaign" className="text-sm font-medium text-gray-900 hover:opacity-70">
            Create
          </Link>
        </div>

			{/* Right Side */}
			<div className="flex items-center gap-4">
				<Link href="/profile" className="text-white hover:text-[#a78bfa] transition-colors">
					<Wallet className="h-5 w-5" />
				</Link>
				<Link
					href="/login"
					className="bg-[#a78bfa] hover:bg-[#7c3aed] text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
				>
					Sign In
				</Link>
			</div>
		</nav>
	)
}