// shafqaat — Campaign card component updated to use real Supabase data
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Clock } from "lucide-react";

// shafqaat — Helper: calculate days remaining from campaign created_at + duration
function calcDaysLeft(createdAt, durationDays) {
	const created = new Date(createdAt);
	const deadline = new Date(created.getTime() + durationDays * 24 * 60 * 60 * 1000);
	const now = new Date();
	const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
	return diff > 0 ? diff : 0;
}

// shafqaat — Campaign card that wraps in a Link to the detail page
export default function CampaignCard({ campaign }) {
	// shafqaat — Map Supabase fields to display values
	const image = campaign.image_url || "/placeholder-campaign.jpg";
	const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration ?? 30);
	const goal = parseFloat(campaign.funding_goal ?? 0).toFixed(2);
	const pledged = parseFloat(campaign.amount_pledged ?? 0).toFixed(2);
	const investorCount = Number(campaign.investor_count ?? 0);
	const category = campaign.category ?? "General";

	return (
		// shafqaat — Clicking the card navigates to /campaigns/[id]
		<Link href={`/campaigns/${campaign.id}`}>
			<div className="bg-[#1e2530] rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200 group cursor-pointer">

				{/* Campaign image */}
				<div className="relative aspect-[16/10]">
					<Image
						src={image}
						alt={campaign.title}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-300"
						// shafqaat — unoptimized needed for external Cloudinary URLs
						unoptimized={image.startsWith("http")}
					/>
					{/* shafqaat — Category badge */}
					<span className="absolute top-3 left-3 bg-[#6f42c1] text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">
						{category}
					</span>
					<button
						onClick={(e) => e.preventDefault()} // shafqaat — stop link navigation on bookmark click
						className="absolute top-3 right-3 text-white/60 hover:text-[#a78bfa] transition-colors"
					>
						<Bookmark className="h-4 w-4" />
					</button>
				</div>

				{/* Campaign info */}
				<div className="p-4 flex-1 flex flex-col">
					<h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-snug">
						{campaign.title}
					</h3>
					<p className="text-xs text-gray-500 mb-3 line-clamp-2">
						{campaign.description}
					</p>

					<div className="grid grid-cols-2 gap-2 mb-3 text-xs">
						<div className="bg-white/5 rounded-lg px-2 py-1.5">
							<p className="text-gray-500">Pledged</p>
							<p className="text-white font-semibold">{pledged} ETH</p>
						</div>
						<div className="bg-white/5 rounded-lg px-2 py-1.5 text-right">
							<p className="text-gray-500">Investors</p>
							<p className="text-white font-semibold">{investorCount}</p>
						</div>
					</div>

					{/* shafqaat — Bottom row: days left + goal */}
					<div className="mt-auto flex items-center justify-between">
						<div className="flex items-center gap-1.5 text-xs text-gray-400">
							<Clock className="h-3 w-3" />
							{daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
						</div>
						<span className="text-sm font-bold text-[#a78bfa]">
							{goal} ETH goal
						</span>
					</div>
				</div>

			</div>
		</Link>
	);
}
