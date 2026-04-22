"use client"
import { Wallet, Menu, X, Sun, Moon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useTheme } from "@/components/theme-provider"

export default function Navbar() {
	const [mobileOpen, setMobileOpen] = useState(false)
	const { theme, toggleTheme } = useTheme()

	const navLinks = [
		{ href: "/", label: "Home" },
		{ href: "/about", label: "About" },
		{ href: "/how-it-works", label: "How It Works" },
		{ href: "/campaigns", label: "Campaigns" },
		{ href: "/contact", label: "Contact" },
	]

	return (
		<nav className="w-full bg-[#181A2A]/95 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-white/5">
			{/* Logo */}
			<Link href="/" className="flex items-center gap-2">
				<Image src="/b-logo.png" alt="FundXProut Logo" width={36} height={36} className="rounded-full" />
				<span className="text-2xl font-bold text-white">FundXprout</span>
			</Link>
			

			{/* Desktop Navigation Links */}
			<div className="hidden items-center gap-8 md:flex">
				{navLinks.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
					>
						{link.label}
					</Link>
				))}
			</div>

			{/* Right Side */}
			<div className="flex items-center gap-3">
				{/* Theme Toggle */}
				<button
					onClick={toggleTheme}
					className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 group"
					aria-label="Toggle theme"
					title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
				>
					{theme === "dark" ? (
						<Sun className="h-4 w-4 text-yellow-400 group-hover:rotate-45 transition-transform duration-300" />
					) : (
						<Moon className="h-4 w-4 text-[#6f42c1] group-hover:-rotate-12 transition-transform duration-300" />
					)}
				</button>

				<Link href="/profile" className="text-gray-300 hover:text-[#a78bfa] transition-colors">
					<Wallet className="h-5 w-5" />
				</Link>
				<Link
					href="/login"
					className="hidden md:inline-block bg-[#a78bfa] hover:bg-[#7c3aed] text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
				>
					Sign In
				</Link>

				{/* Mobile menu toggle */}
				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					className="md:hidden text-gray-300 hover:text-white transition-colors"
				>
					{mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
				</button>
			</div>

			{/* Mobile Menu */}
			{mobileOpen && (
				<div className="absolute top-full left-0 w-full bg-[#181A2A] border-b border-white/10 px-6 py-4 flex flex-col gap-4 md:hidden">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setMobileOpen(false)}
							className="text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
						>
							{link.label}
						</Link>
					))}
					<Link
						href="/login"
						onClick={() => setMobileOpen(false)}
						className="bg-[#a78bfa] hover:bg-[#7c3aed] text-white font-semibold py-2 px-6 rounded-lg transition duration-200 text-center text-sm"
					>
						Sign In
					</Link>
				</div>
			)}
		</nav>
	)
}