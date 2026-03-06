import Image from "next/image"
import { Bookmark } from "lucide-react"

export default function CampaignCard({ campaign }) {
	return (
		<div className="bg-[#1e2530] rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200 group">
			<div className="relative aspect-[16/10]">
				<Image
					src={campaign.image}
					alt={campaign.title}
					fill
					className="object-cover group-hover:scale-105 transition-transform duration-300"
				/>
				{campaign.badge && (
					<span className="absolute top-3 left-3 bg-[#6f42c1] text-white text-xs font-semibold px-3 py-1 rounded-full">
						{campaign.badge}
					</span>
				)}
				<button className="absolute top-3 right-3 text-white/60 hover:text-[#a78bfa] transition-colors">
					<Bookmark className="h-4 w-4" />
				</button>
			</div>
			<div className="p-4 flex-1 flex flex-col">
				<h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-snug">{campaign.title}</h3>
				<p className="text-xs text-gray-500 mb-3">by {campaign.creator}</p>
				<div className="mt-auto flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						{campaign.verified && <span className="w-1.5 h-1.5 rounded-full bg-[#28a745]" />}
						<span className="text-xs text-gray-400">{campaign.daysLeft} days left</span>
					</div>
					<span className="text-sm font-bold text-[#a78bfa]">{campaign.funded} ETH</span>
				</div>
			</div>
		</div>
	)
}