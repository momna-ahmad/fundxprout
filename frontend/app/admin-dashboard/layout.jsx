import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/"); // Unauthorized users get kicked out to home page
  }

  return (
    <div className="min-h-screen bg-[#181A2A]">
      {children}
    </div>
  );
}
