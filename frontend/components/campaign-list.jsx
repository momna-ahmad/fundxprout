"use client";
// shafqaat — Campaign list with real Supabase data, search bar, category filter, and pagination
import { useEffect, useState } from "react";
import CampaignCard from "./campaign-card";
import { getAllCampaigns } from "@/utils/supabase/getCampaigns";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 8; // shafqaat — 8 campaigns per page

const ALL_CATEGORIES = [
  "all", "technology", "art", "music", "film",
  "games", "food", "fashion", "education", "environment", "health",
];

// shafqaat — filterCategory is passed from homepage when user clicks a category pill in the nav
export default function CampaignList({ filterCategory = "all" }) {
  // shafqaat — Master list fetched from Supabase once
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // shafqaat — Search input, active category pill, and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(filterCategory);
  const [currentPage, setCurrentPage] = useState(1);

  // shafqaat — Load all campaigns from Supabase once on mount
  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const data = await getAllCampaigns();
        setAllCampaigns(data);
      } catch (err) {
        setError("Failed to load campaigns. Please try again.");
        console.error("[CampaignList] fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  // shafqaat — When the CategoriesNav passes a new category from the homepage, apply it
  useEffect(() => {
    setActiveCategory(filterCategory);
    setCurrentPage(1);
  }, [filterCategory]);

  // shafqaat — Client-side filter: apply both search text and category simultaneously
  const filtered = allCampaigns.filter((c) => {
    const matchesCategory = activeCategory === "all" || c.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // shafqaat — Pagination: slice the filtered list to the current page window
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // shafqaat — Resets page to 1 whenever user types in the search box
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // shafqaat — Resets page to 1 whenever user clicks a category pill
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <section className="bg-[#181A2A] py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* shafqaat — Header row: title + search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Live Campaigns{!loading && ` (${filtered.length})`}
          </p>

          {/* shafqaat — Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search campaigns…"
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-white/10 rounded-full text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] transition"
            />
          </div>
        </div>

        {/* shafqaat — Category pills (inline with the list, separate from the sticky nav bar) */}
        <div className="flex gap-2 flex-wrap mb-6">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${activeCategory === cat
                  ? "bg-[#6f42c1] text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        {/* shafqaat — Loading spinner */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#6f42c1] animate-spin" />
          </div>
        )}

        {/* shafqaat — Error state */}
        {!loading && error && (
          <div className="text-center py-12 text-red-400 text-sm">{error}</div>
        )}

        {/* shafqaat — No campaigns match the current search/filter */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">
              {allCampaigns.length === 0
                ? "No campaigns yet. Be the first to launch!"
                : `No campaigns found for "${searchQuery || activeCategory}"`}
            </p>
          </div>
        )}

        {/* shafqaat — Campaign grid: shows only the current page slice */}
        {!loading && paginated.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {paginated.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        {/* shafqaat — Pagination controls: only shown when there are multiple pages */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            {/* Previous page button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-[#6f42c1]/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* shafqaat — Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition ${currentPage === page
                    ? "bg-[#6f42c1] text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {page}
              </button>
            ))}

            {/* Next page button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-[#6f42c1]/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="text-xs text-gray-500 ml-2">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}

      </div>
    </section>
  );
}
