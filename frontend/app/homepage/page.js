"use client"
import HeroSection from "@/components/hero-section"
import CategoriesNav from "@/components/categories-nav"
import CampaignList from "@/components/campaign-list"
import Navbar from  "@/components/navbar"
import Footer from "@/components/footer"
import MarketAnalytics from "@/components/market-analytics"
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#181A2A]">
      <Navbar />
      <HeroSection />
      <CategoriesNav />
      <MarketAnalytics />
      <Footer />
    </main>
  )
}