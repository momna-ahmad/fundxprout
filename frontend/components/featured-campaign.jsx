"use client";
// shafqaat — Featured campaign section: uses real Supabase data with scoring algorithm
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Loader2, Clock, Target } from "lucide-react";
import { getRecommendedCampaigns, getFeaturedCampaigns } from "@/utils/supabase/getCampaigns";

// shafqaat — Helper: calc days left from created_at + duration
function calcDaysLeft(createdAt, durationDays) {
	const deadline = new Date(
		new Date(createdAt).getTime() + (durationDays ?? 30) * 24 * 60 * 60 * 1000
	);
	const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
	return diff > 0 ? diff : 0;
}

// shafqaat — Get initials from title for avatar placeholder
function getInitials(title = "") {
	return title
		.split(" ")
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
}

// shafqaat — Left panel card (recommended)
function RecommendedCard({ campaign }) {
	const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration);
	const goal = parseFloat(campaign.funding_goal ?? 0).toFixed(2);
	const image = campaign.image_url;

	return (
		// shafqaat — Links to kampion detail page
		<Link href={`/campaigns/${campaign.id}`}>
			<div className="bg-[#1e2530] rounded-2xl overflow-hidden border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200 cursor-pointer">
				{/* Image */}
				<div className="relative aspect-[16/10]">
					{image ? (
						<Image src={image} alt={campaign.title} fill className="object-cover rounded-t-2xl" unoptimized />
					) : (
						<div className="w-full h-full bg-[#6f42c1]/20 flex items-center justify-center rounded-t-2xl">
							<span className="text-2xl font-black text-[#a78bfa]">{getInitials(campaign.title)}</span>
						</div>
					)}
					{/* shafqaat — "CAMPAIGN WE LOVE" badge for top recommended */}
					<span className="absolute bottom-3 left-3 bg-black/80 text-white flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium">
						<span className="w-4 h-4 rounded-full bg-[#05CE78] flex items-center justify-center">
							<svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
							</svg>
						</span>
						CAMPAIGN WE LOVE
					</span>
				</div>

				{/* Info */}
				<div className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							{/* shafqaat — Avatar with initials (no profile system yet) */}
							<div className="w-8 h-8 rounded-full bg-[#6f42c1]/20 flex items-center justify-center shrink-0">
								<span className="text-xs font-bold text-[#a78bfa]">{getInitials(campaign.title)}</span>
							</div>
							<div>
								<h3 className="font-bold text-white text-sm line-clamp-1">{campaign.title}</h3>
								<p className="text-xs text-gray-400 capitalize">{campaign.category}</p>
							</div>
						</div>
						<button onClick={(e) => e.preventDefault()} className="text-gray-500 hover:text-[#a78bfa] transition-colors ml-2 shrink-0">
							<Bookmark className="h-4 w-4" />
						</button>
					</div>
					<div className="flex items-center justify-between mt-3">
						<span className="text-xs text-gray-400 flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
						</span>
						<span className="text-sm font-bold text-[#a78bfa]">{goal} ETH</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

// shafqaat — Right panel card (featured/small)
function SmallCampaignCard({ campaign }) {
	const daysLeft = calcDaysLeft(campaign.created_at, campaign.duration);
	const goal = parseFloat(campaign.funding_goal ?? 0).toFixed(2);
	const image = campaign.image_url;

	return (
		<Link href={`/campaigns/${campaign.id}`}>
			<div className="bg-[#1e2530] rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-[#6f42c1]/40 transition-all duration-200 cursor-pointer">
				<div className="relative aspect-[4/3]">
					{image ? (
						<Image src={image} alt={campaign.title} fill className="object-cover" unoptimized />
					) : (
						<div className="w-full h-full bg-[#6f42c1]/10 flex items-center justify-center">
							<span className="text-xl font-black text-[#a78bfa]">{getInitials(campaign.title)}</span>
						</div>
					)}
					{/* shafqaat — Category badge */}
					<span className="absolute top-2 left-2 bg-[#6f42c1] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
						{campaign.category ?? "General"}
					</span>
				</div>
				<div className="p-3 flex-1 flex flex-col">
					<p className="font-semibold text-white text-xs line-clamp-2 mb-1">{campaign.title}</p>
					<div className="flex items-center justify-between mt-auto">
						<span className="text-[10px] text-gray-500">{daysLeft > 0 ? `${daysLeft}d left` : "Ended"}</span>
						<span className="text-xs font-bold text-[#a78bfa]">{goal} ETH</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

// shafqaat — Main featured section component
export default function FeaturedCampaign() {
	// shafqaat — Separate state for recommended and featured lists
	const [recommended, setRecommended] = useState([]);
	const [featured, setFeatured] = useState([]);
	const [loading, setLoading] = useState(true);

	// shafqaat — Fetch both lists in parallel on mount
	useEffect(() => {
		async function load() {
			const [rec, feat] = await Promise.all([
				getRecommendedCampaigns(2),   // top 2 by score
				getFeaturedCampaigns(4),       // newest 4 with images
			]);
			setRecommended(rec);
			setFeatured(feat);
			setLoading(false);
		}
		load();
	}, []);

	if (loading) {
		return (
			<section className="bg-[#181A2A] py-8 px-4">
				<div className="max-w-7xl mx-auto flex justify-center py-12">
					<Loader2 className="h-8 w-8 text-[#6f42c1] animate-spin" />
				</div>
			</section>
		);
	}

	// shafqaat — Hide section entirely if no data in Supabase yet
	if (recommended.length === 0 && featured.length === 0) return null;

	return (
		<section className="bg-[#181A2A] py-8 px-4">
			<div className="max-w-7xl mx-auto">
				<p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
					Featured Campaign
				</p>

				<div className="bg-[#0d1117] rounded-3xl p-8 border border-white/5">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

						{/* shafqaat — Left: Recommended by scoring algorithm */}
						{recommended.length > 0 && (
							<div>
								<h2 className="text-lg font-bold text-white mb-4">Recommendation for you</h2>
								<div className="grid grid-cols-1 gap-4">
									{recommended.map((campaign) => (
										<RecommendedCard key={campaign.id} campaign={campaign} />
									))}
								</div>
							</div>
						)}

						{/* shafqaat — Right: Featured (newest with images) */}
						{featured.length > 0 && (
							<div>
								<h2 className="text-lg font-bold text-white mb-4">Feature projects</h2>
								<div className="grid grid-cols-2 gap-4">
									{featured.map((campaign) => (
										<SmallCampaignCard key={campaign.id} campaign={campaign} />
									))}
								</div>
							</div>
						)}

					</div>
				</div>
			</div>
		</section>
	);
}
