import { CldImage } from "next-cloudinary"
import { Bookmark } from "lucide-react"

const recommendedCampaigns = [
	{
		id: 1,
		title: "A Dragon's Gift",
		creator: "Jason Tagmire",
		// Replace with your Cloudinary public ID, e.g. "fundxprout/campaigns/your-public-id"
		image: "fundxprout/campaigns/fantasy-dragon-board-game-art",
		daysLeft: 5,
		funded: 2467,
		verified: true,
		badge: "PLAYERS 1",
	},
	{
		id: 2,
		title: "Jill Sobule: She's Gonna Sing!",
		creator: "Tom Ropelewski",
		image: "fundxprout/campaigns/music-concert-singer-performing",
		daysLeft: 6,
		funded: 143,
		verified: true,
	},
]

const featuredCampaigns = [
	{
		id: 3,
		title: "Chaos Warriors: The Card Game",
		creator: "Studio Games",
		image: "fundxprout/campaigns/chaos-warriors-card-game",
		daysLeft: 12,
		funded: 89,
		verified: true,
	},
	{
		id: 4,
		title: "Pizza Kidd: Gritty Sci-Fi 2D Beat 'Em Up",
		creator: "Night Vision Studios",
		image: "fundxprout/campaigns/pizza-kidd-game",
		daysLeft: 8,
		funded: 234,
		verified: true,
	},
]

function SmallCampaignCard({ campaign }) {
	return (
		<div className="bg-[#1e2530] rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200">
			<div className="relative aspect-[4/3]">
				<CldImage src={campaign.image} alt={campaign.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
			</div>
			<div className="p-3">
				<p className="font-semibold text-white text-sm line-clamp-1">{campaign.title}</p>
				<p className="text-xs text-gray-400">by {campaign.creator}</p>
				<div className="flex items-center justify-between mt-1">
					<span className="text-xs text-gray-500">{campaign.daysLeft} days left</span>
					<span className="text-xs font-bold text-[#a78bfa]">{campaign.funded} ETH</span>
				</div>
			</div>
		</div>
	)
}

function RecommendedCard({ campaign }) {
	return (
		<div className="bg-[#1e2530] rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200">
			<div className="relative aspect-[16/10]">
				<CldImage src={campaign.image} alt={campaign.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover rounded-t-2xl" />
				{campaign.badge && (
					<span className="absolute top-3 left-3 bg-[#6f42c1] text-white text-xs font-semibold px-2 py-1 rounded-full">
						{campaign.badge}
					</span>
				)}
				<span className="absolute bottom-3 left-3 bg-black/80 hover:bg-black text-white flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium">
					<span className="w-4 h-4 rounded-full bg-[#05CE78] flex items-center justify-center">
						<svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
						</svg>
					</span>
					CAMPAIGN WE LOVE
				</span>
			</div>
			<div className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-full bg-[#6f42c1]/20 flex items-center justify-center shrink-0">
							<span className="text-xs font-bold text-[#a78bfa]">PK</span>
						</div>
						<div>
							<div className="flex items-center gap-1">
								{campaign.verified && (
									<span className="w-3 h-3 rounded-full bg-[#28a745] flex items-center justify-center">
										<svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									</span>
								)}
								<h3 className="font-bold text-white text-sm line-clamp-1">{campaign.title}</h3>
							</div>
							<p className="text-xs text-gray-400">by {campaign.creator}</p>
						</div>
					</div>
					<button className="text-gray-500 hover:text-[#a78bfa] transition-colors ml-2 shrink-0">
						<Bookmark className="h-4 w-4" />
					</button>
				</div>
				<div className="flex items-center justify-between mt-3">
					<span className="text-xs text-gray-400">{campaign.daysLeft} days left</span>
					<span className="text-sm font-bold text-[#a78bfa]">{campaign.funded} ETH</span>
				</div>
			</div>
		</div>
	)
}

export default function FeaturedCampaign() {
	return (
		/* White card layout from hero-section Featured Campaign section */
		<section className="px-12 py-6 bg-[#181A2A]">
			<div className="bg-white rounded-2xl p-8 flex flex-col md:flex-row gap-8">
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendation for you</h3>
					<div className="flex flex-col gap-4">
						{recommendedCampaigns.map((campaign) => (
							<RecommendedCard key={campaign.id} campaign={campaign} />
						))}
					</div>
				</div>
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Feature projects</h3>
					<div className="flex gap-4">
						{featuredCampaigns.map((campaign) => (
							<SmallCampaignCard key={campaign.id} campaign={campaign} />
						))}
					</div>
				</div>
			</div>
		</section>
	)
}