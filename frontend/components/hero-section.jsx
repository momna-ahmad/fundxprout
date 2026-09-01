import Image from "next/image"

export default function HeroSection() {
	return (
		<div className="bg-[#181A2A] w-full">

			{/* Hero card only — categories and featured campaign are in their own components */}
			<section className="flex justify-center items-center px-12 py2">
				<div className="relative w-full max-w-8xl p-16  rounded-3xl overflow-hidden" style={{ minHeight: "240px" }}>
					<Image
						src="/bg-hero-section.png"
						alt="Colorful background"
						fill
						className="object-cover"
						priority
					/>
					<div className="relative z-10 flex items-center justify-between p-12 md:p-16 rounded-2xl bg-white shadow-xl" style={{ minHeight: "360px" }}>
						<div className="flex-1">
							<h1 className="text-5xl md:text-6xl font-black text-[#181A2A] leading-tight">
								Bring an amazing<br />project to life.
							</h1>
							<p className="mt-4 text-base text-gray-500 max-w-sm">
								Discover innovative projects from creators around the world and help bring their ideas to reality.
							</p>
						</div>
						<div className="flex-1 flex justify-end">
							<div className="w-48 h-48 rounded-full bg-white p-3 flex items-center justify-center shadow-lg overflow-hidden">
								<Image
									src="/b-logo.png"
									alt="Mascot"
									width={180}
									height={180}
									className="object-contain"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>

		</div>
	)
}