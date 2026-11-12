"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function OwnerCampaignAnalyticsRedirect() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (role === null) router.replace("/login");
    else if (role !== "owner") router.replace("/investor-dashboard");
    else router.replace("/dashboard?tab=overview");
  }, [loading, role, router]);

  return <main className="min-h-screen bg-[#181A2A] p-8 text-center text-sm text-gray-400">Redirecting to campaign overview…</main>;
}
