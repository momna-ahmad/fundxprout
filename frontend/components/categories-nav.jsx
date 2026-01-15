"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const categories = [
  "Art",
  "Comics",
  "Crafts",
  "Dance",
  "Design",
  "Fashion",
  "Film",
  "Food",
  "Games",
  "Journalism",
  "Music",
  "Photography",
  "Publishing",
  "Technology",
  "Theater",
  "Discover",
]

export default function CategoriesNav() {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="bg-background border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 relative">
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md hidden md:flex items-center justify-center h-10 w-10 rounded-md"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-4 px-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((category, index) => (
            <button
              key={category}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors ${
                index === categories.length - 1
                  ? "text-[#037DD6] hover:bg-[#037DD6]/10"
                  : "text-foreground hover:bg-[#F6851B]/10 hover:text-[#E2761B]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md hidden md:flex items-center justify-center h-10 w-10 rounded-md"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
