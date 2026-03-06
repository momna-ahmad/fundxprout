"use client"
import { useState } from "react"
import { User, Settings, Heart, TrendingUp, Wallet } from "lucide-react"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview")

  const user = {
    name: "John Doe",
    email: "john@example.com",
    walletAddress: "0x1234...5678",
    joinedDate: "January 2024",
    totalDonated: 2500,
    campaignsSupported: 12,
    campaignsCreated: 3,
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "campaigns", label: "My Campaigns", icon: TrendingUp },
    { id: "donations", label: "Donations", icon: Heart },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#181A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Profile Header */}
        <div className="bg-[#1a2030] border border-white/5 rounded-3xl p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#6f42c1]/20 border border-[#6f42c1]/30 rounded-full flex items-center justify-center shrink-0">
              <User className="h-10 w-10 text-[#a78bfa]" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-white">{user.name}</h1>
              <p className="text-gray-400 text-sm mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Wallet className="h-3.5 w-3.5 text-[#a78bfa]" />
                <span className="text-xs text-gray-400 font-mono">{user.walletAddress}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Member since {user.joinedDate}</p>
            </div>
            <button className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-6 py-2.5 rounded-full font-semibold text-sm transition duration-200">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Campaigns Created", value: user.campaignsCreated, icon: TrendingUp, color: "#6f42c1" },
            { label: "Campaigns Supported", value: user.campaignsSupported, icon: Heart, color: "#f6851b" },
            { label: "Total Donated", value: `$${user.totalDonated.toLocaleString()}`, icon: Wallet, color: "#037dd6" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-[#1a2030] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: stat.color + "22" }}>
                    <Icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-[#1a2030] border border-white/5 rounded-3xl overflow-hidden">
          <div className="border-b border-white/10 px-6">
            <nav className="flex gap-1 pt-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border-b-2 transition duration-200 ${
                      activeTab === tab.id
                        ? "border-[#6f42c1] text-[#a78bfa] bg-[#6f42c1]/10"
                        : "border-transparent text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-8">

            {activeTab === "overview" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Profile Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    {[
                      { label: "Full Name", value: user.name },
                      { label: "Email", value: user.email },
                      { label: "Wallet Address", value: user.walletAddress, mono: true },
                    ].map((field) => (
                      <div key={field.label} className="bg-[#0d1117] rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{field.label}</p>
                        <p className={`text-white text-sm font-medium ${field.mono ? "font-mono" : ""}`}>{field.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: "Member Since", value: user.joinedDate },
                      { label: "Total Campaigns", value: user.campaignsCreated + user.campaignsSupported },
                    ].map((field) => (
                      <div key={field.label} className="bg-[#0d1117] rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{field.label}</p>
                        <p className="text-white text-sm font-medium">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "campaigns" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">My Campaigns</h2>
                <div className="text-center py-16">
                  <TrendingUp className="h-10 w-10 text-[#6f42c1]/40 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">No campaigns created yet</p>
                  <button className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-6 py-2.5 rounded-full font-semibold text-sm transition duration-200">
                    Create Your First Campaign
                  </button>
                </div>
              </div>
            )}

            {activeTab === "donations" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Donation History</h2>
                <div className="text-center py-16">
                  <Heart className="h-10 w-10 text-[#6f42c1]/40 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No donations made yet</p>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div className="bg-[#0d1117] rounded-xl p-6 border border-white/5">
                    <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Email Notifications</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="rounded border-white/20 bg-[#1a2030] text-[#6f42c1] focus:ring-[#6f42c1]" />
                        <span className="text-sm text-gray-300">Campaign updates</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="rounded border-white/20 bg-[#1a2030] text-[#6f42c1] focus:ring-[#6f42c1]" defaultChecked />
                        <span className="text-sm text-gray-300">Donation confirmations</span>
                      </label>
                    </div>
                  </div>
                  <button className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-6 py-2.5 rounded-full font-semibold text-sm transition duration-200">
                    Save Settings
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}