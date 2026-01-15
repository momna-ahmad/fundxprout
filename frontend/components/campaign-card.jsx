import CampaignCard from "./campaign-card"

const recommendedCampaigns = [
  {
    id: 1,
    title: "A Dragon's Gift",
    creator: "Jason Tagmire",
    image: "/1.jfif",
    daysLeft: 5,
    funded: 2467,
    verified: true,
    badge: "PLAYERS 1",
  },
  {
    id: 2,
    title: "Jill Sobule: \"She's Gonna Sing! You're...",
    creator: "Tom Ropelewski",
    image: "/1.jfif",
    daysLeft: 6,
    funded: 143,
    verified: true,
  },
  {
    id: 3,
    title: "Chaos Warriors: The Card Game",
    creator: "Studio Games",
    image: "/1.jfif",
    daysLeft: 12,
    funded: 89,
    verified: true,
  },
  {
    id: 4,
    title: "Own The Dark",
    creator: "Night Vision Studios",
    image: "/.jfif",
    daysLeft: 8,
    funded: 234,
    verified: true,
  },
]

export default function CampaignList() {
  return (
    <section className="bg-[#FFEEE0] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-6">Recommended For You</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </section>
  )
}
