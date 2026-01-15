"use client"
import { useState } from "react"
import { User, Settings, Heart, TrendingUp, Wallet } from "lucide-react"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    walletAddress: "0x1234...5678",
    joinedDate: "January 2024",
    totalDonated: 2500,
    campaignsSupported: 12,
    campaignsCreated: 3
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "campaigns", label: "My Campaigns", icon: TrendingUp },
    { id: "donations", label: "Donations", icon: Heart },
    { id: "settings", label: "Settings", icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-[#FFEEE0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#6f42c1] rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Wallet className="h-4 w-4 text-[#f6851b]" />
                <span className="text-sm text-gray-500">{user.walletAddress}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Member since {user.joinedDate}</p>
            </div>
            <button className="bg-[#f6851b] hover:bg-[#e57a1a] text-white px-6 py-2 rounded-lg font-medium transition duration-200">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#6f42c1] rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{user.campaignsCreated}</p>
                <p className="text-sm text-gray-600">Campaigns Created</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#f6851b] rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{user.campaignsSupported}</p>
                <p className="text-sm text-gray-600">Campaigns Supported</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#037dd6] rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${user.totalDonated}</p>
                <p className="text-sm text-gray-600">Total Donated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition duration-200 ${
                      activeTab === tab.id
                        ? "border-[#f6851b] text-[#f6851b]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === "overview" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="mt-1 text-gray-900">{user.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
                      <p className="mt-1 text-gray-900 font-mono text-sm">{user.walletAddress}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Member Since</label>
                      <p className="mt-1 text-gray-900">{user.joinedDate}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Campaigns</label>
                      <p className="mt-1 text-gray-900">{user.campaignsCreated + user.campaignsSupported}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "campaigns" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Campaigns</h2>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No campaigns created yet</p>
                  <button className="mt-4 bg-[#f6851b] hover:bg-[#e57a1a] text-white px-6 py-2 rounded-lg font-medium transition duration-200">
                    Create Your First Campaign
                  </button>
                </div>
              </div>
            )}

            {activeTab === "donations" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Donation History</h2>
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No donations made yet</p>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Notifications</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#f6851b] focus:ring-[#f6851b]" />
                        <span className="ml-2 text-sm text-gray-700">Campaign updates</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#f6851b] focus:ring-[#f6851b]" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Donation confirmations</span>
                      </label>
                    </div>
                  </div>
                  <button className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-6 py-2 rounded-lg font-medium transition duration-200">
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