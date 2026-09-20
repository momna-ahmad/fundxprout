import { createClient } from "@/utils/supabase/server";
import { CheckCircle, Clock, ShieldCheck, Building2, User, FileText, UserX, ShieldAlert, Activity } from "lucide-react";
import { adminVerifyKYC, adminVerifyKYB, adminRevokeKYC, adminRevokeKYB } from "@/lib/action";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch pending & verified KYC users
  const [{ data: pendingUsers }, { data: verifiedUsers }] = await Promise.all([
    supabase.from("profiles").select("*").eq("identity_verified", false).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("identity_verified", true).order("created_at", { ascending: false }).limit(10),
  ]);

  // 2. Fetch pending KYB businesses
  const { data: pendingBusinesses } = await supabase
    .from("businesses")
    .select("*, profiles(full_name, user_id, business_reg_url, tax_cert_url, bank_statement_url)")
    .eq("kyb_verified", false)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <div className="mb-8 border-b border-white/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="text-[#a78bfa] h-8 w-8" />
            Admin Verification & Governance Portal
          </h1>
          <p className="text-gray-400">Review KYC/KYB identity submissions, grant or revoke verification credentials, and oversee platform integrity.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/admin-dashboard/audit-log"
            className="px-4 py-2 rounded-xl bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/20 text-sm font-semibold transition flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> Campaign Moderation
          </Link>
          <Link
            href="/admin-dashboard/marketplace"
            className="px-4 py-2 rounded-xl bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/20 text-sm font-semibold transition flex items-center gap-2"
          >
            <Activity className="h-4 w-4" /> Marketplace Orders
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── KYC Verification Section ── */}
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-[#a78bfa]" /> Pending KYC ({pendingUsers?.length || 0})
            </h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {pendingUsers?.length === 0 ? (
              <p className="p-6 text-gray-500 text-center text-sm">No pending KYC requests.</p>
            ) : (
              pendingUsers?.map((user) => (
                <div key={user.user_id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white/[0.02] transition">
                  <div>
                    <h3 className="font-semibold text-white">{user.full_name || "Unknown User"}</h3>
                    <p className="text-sm text-gray-400 font-mono text-xs">{user.user_id}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      {user.national_id_url && (
                        <Link href={user.national_id_url} target="_blank" className="text-[#a78bfa] hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> ID Doc
                        </Link>
                      )}
                      {user.selfie_url && (
                        <Link href={user.selfie_url} target="_blank" className="text-[#a78bfa] hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Selfie
                        </Link>
                      )}
                    </div>
                  </div>
                  <form action={async () => {
                    "use server";
                    await adminVerifyKYC(user.user_id);
                  }}>
                    <button type="submit" className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle className="h-4 w-4" /> Approve KYC
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── KYB Verification Section ── */}
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#a78bfa]" /> Pending KYB ({pendingBusinesses?.length || 0})
            </h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {pendingBusinesses?.length === 0 ? (
              <p className="p-6 text-gray-500 text-center text-sm">No pending KYB requests.</p>
            ) : (
              pendingBusinesses?.map((biz) => (
                <div key={biz.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white/[0.02] transition">
                  <div>
                    <h3 className="font-semibold text-white">{biz.business_name}</h3>
                    <p className="text-sm text-gray-400 text-xs">Owner: {biz.profiles?.full_name}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {biz.profiles?.business_reg_url && (
                        <Link href={biz.profiles.business_reg_url} target="_blank" className="text-[#a78bfa] hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Reg Doc
                        </Link>
                      )}
                      {biz.profiles?.tax_cert_url && (
                        <Link href={biz.profiles.tax_cert_url} target="_blank" className="text-[#a78bfa] hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Tax Cert
                        </Link>
                      )}
                    </div>
                  </div>
                  <form action={async () => {
                    "use server";
                    await adminVerifyKYB(biz.id);
                  }}>
                    <button type="submit" className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap">
                      <CheckCircle className="h-4 w-4" /> Approve KYB
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Verified Users & Revoke Section ── */}
      <div className="mt-10 bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" /> Active Verified Profiles ({verifiedUsers?.length || 0})
          </h2>
          <span className="text-xs text-gray-400">Admins can revoke verification if suspicious activity occurs</span>
        </div>
        <div className="divide-y divide-white/5">
          {verifiedUsers?.map((user) => (
            <div key={user.user_id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white/[0.02] transition">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {user.full_name || "Verified Investor"}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    KYC Active
                  </span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{user.user_id} · {user.wallet_address || 'No Wallet'}</p>
              </div>
              <form action={async () => {
                "use server";
                await adminRevokeKYC(user.user_id);
              }}>
                <button type="submit" className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap">
                  <UserX className="h-3.5 w-3.5" /> Revoke Verification
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
