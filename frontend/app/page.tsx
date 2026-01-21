"use client"
import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import CategoriesNav from "@/components/categories-nav"
import FeaturedCampaign from "@/components/featured-campaign"
import CampaignList from "@/components/campaign-list"


export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FFEEE0]">
      <Navbar />

      <div className="pt-24">
        <HeroSection />

        <CategoriesNav />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FeaturedCampaign />
            {/*<CampaignList />*/}
          </div>
        </section>
      </div>
    </main>
  )
}
