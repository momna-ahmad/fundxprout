"use client";
// shafqaat — Categories navigation bar with Lucide icons + purple theme
// Calls onCategoryChange(value) when user clicks a category
// This is used by homepage to filter the CampaignList below
import { useState } from "react";
import {
	Globe,
	Cpu,
	Palette,
	Music2,
	Film,
	Gamepad2,
	UtensilsCrossed,
	Shirt,
	GraduationCap,
	Leaf,
	HeartPulse,
} from "lucide-react";

// shafqaat — Category definitions with modern Lucide icons and purple-friendly labels
const CATEGORIES = [
	{ name: "All", value: "all", Icon: Globe },
	{ name: "Technology", value: "technology", Icon: Cpu },
	{ name: "Art", value: "art", Icon: Palette },
	{ name: "Music", value: "music", Icon: Music2 },
	{ name: "Film", value: "film", Icon: Film },
	{ name: "Games", value: "games", Icon: Gamepad2 },
	{ name: "Food", value: "food", Icon: UtensilsCrossed },
	{ name: "Fashion", value: "fashion", Icon: Shirt },
	{ name: "Education", value: "education", Icon: GraduationCap },
	{ name: "Environment", value: "environment", Icon: Leaf },
	{ name: "Health", value: "health", Icon: HeartPulse },
];

// shafqaat — onCategoryChange is passed from homepage/page.js
// When a category pill is clicked → parent updates its activeCategory state
// → CampaignList below re-filters based on that value
export default function CategoriesNav({ onCategoryChange }) {
	const [active, setActive] = useState("all");

	const handleClick = (value) => {
		setActive(value);
		// shafqaat — Notify parent so CampaignList can filter
		if (onCategoryChange) onCategoryChange(value);
	};

	return (
		<nav className="bg-[#181A2A] px-4 py-4 border-b border-white/5 sticky top-0 z-10 backdrop-blur-sm">
			<div className="max-w-7xl mx-auto">
				{/* shafqaat — Horizontally scrollable pill row */}
				<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
					{CATEGORIES.map(({ name, value, Icon }) => {
						const isActive = active === value;
						return (
							<button
								key={value}
								onClick={() => handleClick(value)}
								className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold
                  whitespace-nowrap transition-all duration-200 shrink-0
                  ${isActive
										? "bg-[#6f42c1] text-white shadow-lg shadow-[#6f42c1]/30 scale-105"
										: "bg-white/5 text-gray-400 hover:bg-[#6f42c1]/20 hover:text-[#a78bfa] border border-white/5"
									}
                `}
							>
								{/* shafqaat — Lucide icon, size 13px for tight pill fit */}
								<Icon
									size={13}
									className={isActive ? "text-white" : "text-gray-500"}
								/>
								{name}
							</button>
						);
					})}
				</div>
			</div>
		</nav>
	);
}