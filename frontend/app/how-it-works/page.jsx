//frontend/app/how-it-works/page.jsx
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Search, FileText, Rocket, Coins, ShieldCheck, BarChart3 } from "lucide-react"

export const metadata = {
	title: "How It Works — FundXprout",
	description: "Learn how FundXprout works — from creating a campaign to investing through blockchain smart contracts.",
}

const steps = [
	{
		icon: FileText,
		step: "01",
		title: "Create Your Campaign",
		description: "Business owners sign up, verify their identity through KYC/KYB, and create a campaign with their pitch deck, business plan, financials, and funding goals.",
		audience: "For Entrepreneurs",
	},
	{
		icon: ShieldCheck,
		step: "02",
		title: "Smart Contract Deployment",
		description: "Once your campaign is reviewed, a smart contract is deployed on the Ethereum Sepolia testnet. This contract manages all funds transparently and securely.",
		audience: "Automated",
	},
	{
		icon: Search,
		step: "03",
		title: "Discover Campaigns",
		description: "Investors browse campaigns by category, review pitch decks and financials stored on IPFS, and evaluate opportunities using our AI-powered risk assessment.",
		audience: "For Investors",
	},
	{
		icon: Coins,
		step: "04",
		title: "Invest via MetaMask",
		description: "Connect your MetaMask wallet, select an amount, and invest directly through the smart contract. Every transaction is recorded on-chain for full transparency.",
		audience: "For Investors",
	},
	{
		icon: BarChart3,
		step: "05",
		title: "Track Progress",
		description: "Both entrepreneurs and investors can track campaign progress, funding milestones, and investment performance through their personalized dashboards.",
		audience: "For Everyone",
	},
	{
		icon: Rocket,
		step: "06",
		title: "Funds Released",
		description: "When the campaign reaches its funding goal and conditions are met, smart contracts automatically release funds to the business owner — no intermediaries needed.",
		audience: "Automated",
	},
]

export default function HowItWorksPage() {
	return (
		<main className="min-h-screen bg-[#181A2A]">
			<Navbar />

			{/* Hero */}
			<section className="relative py-24 px-6 md:px-12 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6f42c1]/10 to-transparent pointer-events-none" />
				<div className="max-w-4xl mx-auto text-center relative z-10">
					<span className="text-xs font-bold uppercase tracking-[0.3em] text-[#a78bfa] mb-4 inline-block">How It Works</span>
					<h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
						From Idea to Funding in<br />
						<span className="bg-gradient-to-r from-[#a78bfa] to-[#6f42c1] bg-clip-text text-transparent">Six Simple Steps</span>
					</h1>
					<p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
						FundXprout makes decentralized fundraising simple. Whether you{"'"}re an entrepreneur or an investor, here{"'"}s how the platform works.
					</p>
				</div>
			</section>

			{/* Steps */}
			<section className="py-16 px-6 md:px-12">
				<div className="max-w-4xl mx-auto space-y-8">
					{steps.map((item, index) => (
						<div
							key={item.step}
							className="relative flex flex-col md:flex-row items-start gap-6 bg-[#1a2030] border border-white/5 rounded-2xl p-8 hover:border-[#6f42c1]/30 transition-all group"
						>
							{/* Step number */}
							<div className="shrink-0 w-16 h-16 rounded-2xl bg-[#6f42c1]/15 flex items-center justify-center group-hover:bg-[#6f42c1]/25 transition-colors">
								<item.icon className="h-7 w-7 text-[#a78bfa]" />
							</div>

							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<span className="text-xs font-bold text-[#6f42c1] bg-[#6f42c1]/10 px-2 py-0.5 rounded-full">
										Step {item.step}
									</span>
									<span className="text-xs text-gray-500">{item.audience}</span>
								</div>
								<h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
								<p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
							</div>

							{/* Connector line (except last) */}
							{index < steps.length - 1 && (
								<div className="hidden md:block absolute -bottom-8 left-14 w-0.5 h-8 bg-gradient-to-b from-[#6f42c1]/30 to-transparent" />
							)}
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="py-20 px-6 md:px-12">
				<div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-[#6f42c1]/20 to-[#1a2030] border border-[#6f42c1]/20 rounded-3xl p-12">
					<h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
					<p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
						Join hundreds of entrepreneurs and investors on FundXprout. Create your first campaign or discover your next investment.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<a href="/create-campaign" className="bg-[#6f42c1] hover:bg-[#5a3599] text-white font-bold py-3 px-8 rounded-full transition text-sm">
							Create Campaign
						</a>
						<a href="/" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-8 rounded-full transition text-sm">
							Browse Campaigns
						</a>
					</div>
				</div>
			</section>

			<Footer />
		</main>
	)
}
