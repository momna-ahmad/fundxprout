"use client";

import { useActionState } from "react";
import { BriefcaseBusiness, HandCoins } from "lucide-react";
import { saveRoleFromProfileForm } from "@/lib/action";

const initialState = { error: "" };

type Props = {
  fullName: string;
};

export default function RoleSelectionForm({ fullName }: Props) {
  const [state, formAction, isPending] = useActionState(
    saveRoleFromProfileForm,
    initialState,
  );

  return (
    <div className="min-h-screen bg-[#181A2A] flex items-center justify-center px-4">
      <div className="bg-[#1a2030] border border-white/5 rounded-3xl p-8 w-full max-w-2xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Choose Your Role</h1>
          <p className="text-gray-400 text-sm">Welcome {fullName}. Tell us what you want to do on FundXprout.</p>
        </div>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="fullName" value={fullName} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="group cursor-pointer">
              <input
                type="radio"
                name="role"
                value="owner"
                className="peer sr-only"
                required
              />
              <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-5 transition peer-checked:border-[#6f42c1] peer-checked:ring-2 peer-checked:ring-[#6f42c1]/40 group-hover:border-[#6f42c1]/40">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#6f42c1]/20 text-[#c9a7ff]">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <p className="text-white font-semibold">Owner</p>
                <p className="text-gray-400 text-sm mt-1">Create and manage campaigns.</p>
              </div>
            </label>

            <label className="group cursor-pointer">
              <input
                type="radio"
                name="role"
                value="investor"
                className="peer sr-only"
                required
              />
              <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-5 transition peer-checked:border-[#6f42c1] peer-checked:ring-2 peer-checked:ring-[#6f42c1]/40 group-hover:border-[#6f42c1]/40">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <HandCoins className="h-5 w-5" />
                </div>
                <p className="text-white font-semibold">Investor</p>
                <p className="text-gray-400 text-sm mt-1">Discover and invest in campaigns.</p>
              </div>
            </label>
          </div>

          {state?.error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition duration-200 text-sm"
          >
            {isPending ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
