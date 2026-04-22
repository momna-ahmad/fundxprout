import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import RoleSelectionForm from "@/components/role-selection-form";

const normalizeRole = (role: string | null | undefined) => {
  const value = (role || "").trim().toLowerCase();
  if (value === "owner" || value === "business_owner") return "owner";
  if (value === "investor") return "investor";
  return null;
};

const getRoleRedirect = (role: "owner" | "investor") =>
  role === "owner" ? "/dashboard" : "/investor-dashboard";

const deriveFullName = (user: any, profileFullName?: string | null) => {
  if (profileFullName && profileFullName.trim()) return profileFullName.trim();

  const fromMetadata =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim();

  if (fromMetadata && fromMetadata.trim()) return fromMetadata.trim();
  if (user?.email) return user.email.split("@")[0];
  return "User";
};

export default async function SelectRolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single();

  const role = normalizeRole(profile?.role);
  if (role) {
    redirect(getRoleRedirect(role));
  }

  const fullName = deriveFullName(user, profile?.full_name);

  return <RoleSelectionForm fullName={fullName} />;
}
