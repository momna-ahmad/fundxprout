import Image from "next/image"
import { Bookmark } from "lucide-react"

export default function FeaturedCampaign() {
  return (
    <section className="bg-[#FFEEE0] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-6">Featured Campaign</h2>
        <div className="overflow-hidden border-0 shadow-lg bg-white rounded-lg">
          <div className="relative aspect-[16/10]">
            <Image src="/anime-style-action-game-character.jpg" alt="Featured Campaign" fill className="object-cover" />
            <span className="absolute bottom-4 left-4 bg-black/80 hover:bg-black text-white flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium">
              <span className="w-5 h-5 rounded-full bg-[#05CE78] flex items-center justify-center">
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              CAMPAIGN WE LOVE
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFEEE0] flex items-center justify-center">
                  <span className="text-sm font-bold text-[#E2761B]">PK</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#28A745] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <h3 className="font-semibold text-gray-900">{"Pizza Kidd: Gritty Sci-Fi 2D Beat 'Em Up Action"}</h3>
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-[#F6851B] transition-colors">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
