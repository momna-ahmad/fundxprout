"use client"

import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Mail, MapPin, Clock, MessageSquare } from "lucide-react"

const contactInfo = [
	{ icon: Mail, title: "Email", value: "support@fundxprout.com", subtitle: "We reply within 24 hours" },
	{ icon: MapPin, title: "Location", value: "Pakistan", subtitle: "University Project" },
	{ icon: Clock, title: "Availability", value: "Mon — Fri, 9am — 6pm", subtitle: "Pakistan Standard Time" },
	{ icon: MessageSquare, title: "Community", value: "Join our Discord", subtitle: "Connect with other users" },
]

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-[#181A2A]">
			<Navbar />

			{/* Hero */}
			<section className="relative py-24 px-6 md:px-12 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-[#6f42c1]/10 to-transparent pointer-events-none" />
				<div className="max-w-4xl mx-auto text-center relative z-10">
					<span className="text-xs font-bold uppercase tracking-[0.3em] text-[#a78bfa] mb-4 inline-block">Contact Us</span>
					<h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
						We{"'"}d Love to<br />
						<span className="bg-gradient-to-r from-[#a78bfa] to-[#6f42c1] bg-clip-text text-transparent">Hear From You</span>
					</h1>
					<p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
						Have questions, feedback, or partnership inquiries? Reach out and our team will get back to you as soon as possible.
					</p>
				</div>
			</section>

			{/* Contact Grid */}
			<section className="py-16 px-6 md:px-12">
				<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">

					{/* Contact Info Cards */}
					<div className="lg:col-span-2 space-y-4">
						{contactInfo.map((item) => (
							<div key={item.title} className="bg-[#1a2030] border border-white/5 rounded-2xl p-5 hover:border-[#6f42c1]/30 transition-colors">
								<div className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-xl bg-[#6f42c1]/15 flex items-center justify-center shrink-0">
										<item.icon className="h-5 w-5 text-[#a78bfa]" />
									</div>
									<div>
										<p className="text-xs text-gray-500 mb-0.5">{item.title}</p>
										<p className="text-white font-semibold text-sm">{item.value}</p>
										<p className="text-gray-500 text-xs mt-0.5">{item.subtitle}</p>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Contact Form */}
					<div className="lg:col-span-3 bg-[#1a2030] border border-white/5 rounded-2xl p-8">
						<h2 className="text-xl font-bold text-white mb-6">Send us a message</h2>
						<form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
										Full Name
									</label>
									<input
										type="text"
										placeholder="John Doe"
										className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
									/>
								</div>
								<div>
									<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
										Email
									</label>
									<input
										type="email"
										placeholder="you@example.com"
										className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
									/>
								</div>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
									Subject
								</label>
								<input
									type="text"
									placeholder="What's this about?"
									className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
									Message
								</label>
								<textarea
									rows={5}
									placeholder="Tell us what you need help with..."
									className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm resize-none"
								/>
							</div>
							<button
								type="submit"
								className="w-full bg-[#6f42c1] hover:bg-[#5a3599] text-white font-bold py-3 px-4 rounded-full transition duration-200 text-sm"
							>
								Send Message
							</button>
							<p className="text-xs text-gray-600 text-center">
								This form is for demonstration purposes only.
							</p>
						</form>
					</div>

				</div>
			</section>

			<Footer />
		</main>
	)
}
