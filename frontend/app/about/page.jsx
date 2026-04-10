import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Shield, Globe, Users, Zap } from "lucide-react"

export const metadata = {
	title: "About — FundXprout",
	description: "Learn about FundXprout, the blockchain-powered crowdfunding platform connecting visionary entrepreneurs with global investors.",
}

export default function AboutPage() {
	return (
		<main className="min-h-screen bg-[#181A2A]">
			<Navbar />

			{/* Hero */}
			<section className="relative py-24 px-6 md:px-12 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6f42c1]/10 to-transparent pointer-events-none" />
				<div className="max-w-4xl mx-auto text-center relative z-10">
					<span className="text-xs font-bold uppercase tracking-[0.3em] text-[#a78bfa] mb-4 inline-block">About Us</span>
					<h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
						Empowering the Future of<br />
						<span className="bg-gradient-to-r from-[#a78bfa] to-[#6f42c1] bg-clip-text text-transparent">Decentralized Funding</span>
					</h1>
					<p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
						FundXprout is a blockchain-powered crowdfunding platform that connects visionary entrepreneurs with global investors through transparent, secure, and decentralized fundraising.
					</p>
				</div>
			</section>

			{/* Mission & Vision */}
			<section className="py-16 px-6 md:px-12">
				<div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="bg-[#1a2030] border border-white/5 rounded-2xl p-8 hover:border-[#6f42c1]/30 transition-colors">
						<h2 className="text-xl font-bold text-white mb-4">Our Mission</h2>
						<p className="text-gray-400 text-sm leading-relaxed">
							To democratize access to capital by leveraging blockchain technology, enabling anyone with a great idea to raise funds transparently and anyone with capital to invest securely — regardless of geography or background.
						</p>
					</div>
					<div className="bg-[#1a2030] border border-white/5 rounded-2xl p-8 hover:border-[#6f42c1]/30 transition-colors">
						<h2 className="text-xl font-bold text-white mb-4">Our Vision</h2>
						<p className="text-gray-400 text-sm leading-relaxed">
							A world where funding is borderless, trustless, and fair. We envision a future where smart contracts replace intermediaries, where every transaction is verifiable on-chain, and where innovation is never stifled by lack of access to capital.
						</p>
					</div>
				</div>
			</section>

			{/* Values */}
			<section className="py-16 px-6 md:px-12">
				<div className="max-w-5xl mx-auto">
					<h2 className="text-2xl font-bold text-white text-center mb-12">What We Stand For</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[
							{ icon: Shield, title: "Security", desc: "Smart contracts ensure funds are protected and disbursed only when conditions are met." },
							{ icon: Globe, title: "Transparency", desc: "Every transaction is recorded on the blockchain — publicly verifiable and tamper-proof." },
							{ icon: Users, title: "Community", desc: "We believe in the power of collective investment and community-driven growth." },
							{ icon: Zap, title: "Innovation", desc: "Cutting-edge technology meets real-world fundraising to create something extraordinary." },
						].map((item) => (
							<div key={item.title} className="bg-[#1a2030] border border-white/5 rounded-2xl p-6 text-center hover:border-[#6f42c1]/30 transition-all hover:-translate-y-1">
								<div className="w-12 h-12 rounded-xl bg-[#6f42c1]/15 flex items-center justify-center mx-auto mb-4">
									<item.icon className="h-6 w-6 text-[#a78bfa]" />
								</div>
								<h3 className="text-white font-bold mb-2">{item.title}</h3>
								<p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Team Section */}
			<section className="py-16 px-6 md:px-12">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-2xl font-bold text-white mb-4">Built by Students, For Everyone</h2>
					<p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed mb-12">
						FundXprout is a Final Year Project built with passion and purpose. Our team combines expertise in blockchain development, full-stack engineering, and AI to deliver a platform that&apos;s both powerful and user-friendly.
					</p>
					<div className="bg-[#1a2030] border border-white/5 rounded-2xl p-8 inline-block">
						<p className="text-[#a78bfa] font-bold text-lg">🚀 FundXprout Team</p>
						<p className="text-gray-500 text-sm mt-2">Blockchain · Full-Stack · AI/ML</p>
					</div>
				</div>
			</section>

			<Footer />
		</main>
	)
}
