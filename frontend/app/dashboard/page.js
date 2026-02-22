"use client";
import { useState } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Plus,
  Eye,
  Edit,
  BarChart3,
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
    {
      id: 1,
      title: "Sustainable Energy Project",
      goal: 10000,
      raised: 7500,
      backers: 89,
      daysLeft: 15,
      status: "active",
    },
    {
      id: 2,
      title: "Community Garden Initiative",
      goal: 5000,
      raised: 3200,
      backers: 45,
      daysLeft: 8,
      status: "active",
    },
    {
      id: 3,
      title: "Educational Tech Startup",
      goal: 25000,
      raised: 18000,
      backers: 156,
      daysLeft: 22,
      status: "active",
    },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "campaigns", label: "My Campaigns", icon: Target },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#FFEEE0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Creator Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your campaigns and track your progress
            </p>
          </div>
          <Link
            href="/create-campaign"
            className="bg-[#f6851b] hover:bg-[#e57a1a] text-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Campaign
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#6f42c1] rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.totalRaised.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Total Raised</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#f6851b] rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalBackers}
                </p>
                <p className="text-sm text-gray-600">Total Backers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#037dd6] rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.activeCampaigns}
                </p>
                <p className="text-sm text-gray-600">Active Campaigns</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#28a745] rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completedCampaigns}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
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
                );
              })}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === "overview" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Campaign Overview
                </h2>
                <div className="space-y-6">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            campaign.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Goal</p>
                          <p className="font-semibold">
                            ${campaign.goal.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Raised</p>
                          <p className="font-semibold text-[#f6851b]">
                            ${campaign.raised.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Backers</p>
                          <p className="font-semibold">{campaign.backers}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Days Left</p>
                          <p className="font-semibold">{campaign.daysLeft}</p>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className="bg-[#f6851b] h-2 rounded-full"
                          style={{
                            width: `${(campaign.raised / campaign.goal) * 100}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex gap-3">
                        <button className="flex items-center gap-2 text-[#6f42c1] hover:text-[#5a3599] font-medium">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium">
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "campaigns" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  All Campaigns
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Campaign
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Goal
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Raised
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Backers
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-4 px-4 font-medium">
                            {campaign.title}
                          </td>
                          <td className="py-4 px-4">
                            ${campaign.goal.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-[#f6851b] font-medium">
                            ${campaign.raised.toLocaleString()}
                          </td>
                          <td className="py-4 px-4">{campaign.backers}</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <button className="text-[#6f42c1] hover:text-[#5a3599] font-medium text-sm">
                                View
                              </button>
                              <button className="text-gray-600 hover:text-gray-800 font-medium text-sm">
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Analytics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Monthly Performance
                    </h3>
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Analytics data will appear here
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Top Campaigns
                    </h3>
                    <div className="space-y-3">
                      {campaigns.slice(0, 3).map((campaign, index) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">
                            {campaign.title}
                          </span>
                          <span className="text-sm text-[#f6851b] font-medium">
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
