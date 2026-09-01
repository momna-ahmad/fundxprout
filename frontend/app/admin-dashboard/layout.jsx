import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ShieldCheck, LogOut, ExternalLink } from "lucide-react";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  const isMetadataAdmin = user?.user_metadata?.is_admin === true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin" && !isMetadataAdmin) {
    redirect("/admin-login"); // Unauthorized users redirected to admin login portal
  }

  return (
    <div className="min-h-screen bg-[#0d1221] text-white">
      {/* Top Admin Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#161c2e]/90 backdrop-blur-md border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <Link href="/admin-dashboard" className="font-bold text-white text-base hover:text-[#a78bfa] transition">
              FundXProut Admin
            </Link>
            <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] font-bold">
              Master Control
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-400 hidden sm:inline">
            Logged in as <strong className="text-white font-mono">{user.email}</strong>
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition"
          >
            App Main Site <ExternalLink size={12} />
          </Link>
          <form
            action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect("/admin-login");
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold transition"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-8">
        {children}
      </main>
    </div>
  );
}
