"use client";
// Homepage — wires CategoriesNav → CampaignList via shared state
import { useState } from "react";
import HeroSection from "@/components/hero-section";
import CategoriesNav from "@/components/categories-nav";
import FeaturedCampaign from "@/components/featured-campaign";
import CampaignList from "@/components/campaign-list";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MarketAnalytics from "@/components/market-analytics";

export default function HomePage() {
  // activeCategory is shared between CategoriesNav and CampaignList
  const [activeCategory, setActiveCategory] = useState("all");

  return (
    <main className="min-h-screen bg-[#181A2A]">
      <Navbar />
      <HeroSection />
      <CategoriesNav onCategoryChange={setActiveCategory} />
      <FeaturedCampaign />
      <CampaignList filterCategory={activeCategory} />
      <MarketAnalytics />
      <Footer />
    </main>
  );
}
