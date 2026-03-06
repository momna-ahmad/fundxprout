"use client";
import { useState } from "react";
import {
  TrendingUp, Users, DollarSign, Target,
  Plus, Eye, Edit, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import supabase from "@/lib/supabase-client";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const stats = {
    totalRaised: 12500,
    totalBackers: 234,
    activeCampaigns: 3,
    completedCampaigns: 7,
  };

  const campaigns = [
    { id: 1, title: "Sustainable Energy Project", goal: 10000, raised: 7500, backers: 89, daysLeft: 15, status: "active" },
    { id: 2, title: "Community Garden Initiative", goal: 5000, raised: 3200, backers: 45, daysLeft: 8, status: "active" },
    { id: 3, title: "Educational Tech Startup", goal: 25000, raised: 18000, backers: 156, daysLeft: 22, status: "active" },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "campaigns", label: "My Campaigns", icon: Target },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#181A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Creator Dashboard</h1>
            <p className="text-gray-400 mt-1 text-sm">Manage your campaigns and track your progress</p>
          </div>
          <Link
            href="/create-campaign"
            className="bg-[#6f42c1] hover:bg-[#5a3599] text-white px-6 py-3 rounded-full font-semibold transition duration-200 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Raised", value: `$${stats.totalRaised.toLocaleString()}`, icon: DollarSign, color: "#6f42c1" },
            { label: "Total Backers", value: stats.totalBackers, icon: Users, color: "#f6851b" },
            { label: "Active Campaigns", value: stats.activeCampaigns, icon: Target, color: "#037dd6" },
            { label: "Completed", value: stats.completedCampaigns, icon: TrendingUp, color: "#28a745" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-[#1a2030] rounded-2xl p-5 border border-white/5">
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

        {/* Tabs + Content */}
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">

          {/* Tab Nav */}
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

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Campaign Overview</h2>
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-[#0d1117] rounded-2xl p-6 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-white">{campaign.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          campaign.status === "active"
                            ? "bg-[#28a745]/20 text-[#28a745]"
                            : "bg-white/10 text-gray-400"
                        }`}>
                          {campaign.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {[
                          { label: "Goal", value: `$${campaign.goal.toLocaleString()}`, accent: false },
                          { label: "Raised", value: `$${campaign.raised.toLocaleString()}`, accent: true },
                          { label: "Backers", value: campaign.backers, accent: false },
                          { label: "Days Left", value: campaign.daysLeft, accent: false },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                            <p className={`font-bold text-sm ${item.accent ? "text-[#a78bfa]" : "text-white"}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-white/10 rounded-full h-1.5 mb-4">
                        <div
                          className="bg-[#6f42c1] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((campaign.raised / campaign.goal) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex gap-4">
                        <button className="flex items-center gap-1.5 text-[#a78bfa] hover:text-white text-xs font-medium transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-medium transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaigns Tab */}
            {activeTab === "campaigns" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">All Campaigns</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["Campaign", "Goal", "Raised", "Backers", "Status", "Actions"].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-medium text-white">{campaign.title}</td>
                          <td className="py-4 px-4 text-gray-300">${campaign.goal.toLocaleString()}</td>
                          <td className="py-4 px-4 text-[#a78bfa] font-semibold">${campaign.raised.toLocaleString()}</td>
                          <td className="py-4 px-4 text-gray-300">{campaign.backers}</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-[#28a745]/20 text-[#28a745] rounded-full text-xs font-semibold">
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-3">
                              <button className="text-[#a78bfa] hover:text-white text-xs font-medium transition-colors">View</button>
                              <button className="text-gray-400 hover:text-white text-xs font-medium transition-colors">Edit</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0d1117] rounded-2xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4">Monthly Performance</h3>
                    <div className="text-center py-8">
                      <BarChart3 className="h-10 w-10 text-[#6f42c1]/40 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Analytics data will appear here</p>
                    </div>
                  </div>
                  <div className="bg-[#0d1117] rounded-2xl p-6 border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4">Top Campaigns</h3>
                    <div className="space-y-3">
                      {campaigns.slice(0, 3).map((campaign) => (
                        <div key={campaign.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-300 truncate mr-3">{campaign.title}</span>
                          <span className="text-sm text-[#a78bfa] font-semibold whitespace-nowrap">
                            ${campaign.raised.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}