"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, TrendingUp } from "lucide-react";
import Navbar from "@/components/navbar";
import OwnerCampaignAnalytics from "@/components/owner-campaign-analytics";
import { getMyCampaigns } from "@/utils/supabase/getCampaigns";
import { getUserRole } from "@/utils/supabase/getProfile";

export default function OwnerCampaignAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      const role = await getUserRole();

      if (role === null) {
        router.replace("/login");
        return;
      }

      if (role !== "owner") {
        router.replace("/investor-dashboard");
        return;
      }

      const data = await getMyCampaigns();

      if (!isMounted) return;
      setCampaigns(data);
      setLoading(false);
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#181A2A]">
      <Navbar />

      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 m-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
              Owner Analytics
            </p>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-[#a78bfa]" />
              Campaign performance
            </h1>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              A private view of how your own campaigns are performing across funding, status, and category mix.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold px-5 py-3 rounded-full transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="bg-[#0d1117] rounded-3xl border border-white/5 p-10 text-center text-gray-400 text-sm">
            Loading your campaign analytics...
          </div>
        ) : (
          <OwnerCampaignAnalytics campaigns={campaigns} />
        )}
      </main>
    </div>
  );
}