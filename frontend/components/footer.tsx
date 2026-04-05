import Image from "next/image"
import Link from "next/link"

export default function Footer() {
	return (
		<footer className="bg-[#0d1117] mt-9 pb-8">
			<div className="max-w-9xl mx-auto">
				<div className="bg-[#6f42c1] rounded-3xl p-30">
					<div className="flex flex-col md:flex-row items-start gap-8">
						{/* Logo + Name */}
						<div className="flex items-center gap-3 mb-6 md:mb-0">
							<div className="w-14 h-14 relative">
								<Image
									src="/logo.png"
									alt="FundXProut Logo"
									fill
									className="object-contain"
								/>
							</div>
							<span className="text-2xl font-black text-white tracking-tight">FundXProut</span>
						</div>

						{/* Nav Links */}
						<div className="flex gap-12 mt-2">
							<div>
								<Link href="/homepage" className="text-sm text-white/80 hover:text-white transition-colors">
									Campaigns
								</Link>
							</div>
							<div>
								<Link href="#" className="text-sm text-white/80 hover:text-white transition-colors">
									MetaMask
								</Link>
							</div>
						</div>
					</div>

					<div className="mt-12 pt-6 border-t border-white/20">
						<p className="text-white/50 text-xs">
							© {new Date().getFullYear()} FundXProut. All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</footer>
	)
}