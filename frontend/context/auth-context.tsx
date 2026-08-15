// ── frontend/context/auth-context.tsx ───────────────────────────────────────────────
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isSyncing = false;

    const goTo = (target: string) => {
      if (pathname !== target) {
        router.replace(target);
      }
    };

    const clearAuthAndGoHome = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      goTo("/");
    };

    const syncAuthAndProfile = async () => {
      if (isSyncing) return;
      isSyncing = true;
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData.session ?? null;

        if (!currentSession) {
          setSession(null);
          setUser(null);
          return;
        }

        setSession(currentSession);

        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !authUser) {
          await clearAuthAndGoHome();
          return;
        }

        setUser(authUser);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", authUser.id)
          .single();

        // No profile row in profiles table -> role selection form.
        if (profileError?.code === "PGRST116") {
          goTo("/auth/select-role");
          return;
        }

        // Profile refetch unexpectedly null/invalid on refresh -> clear session + home.
        if (profileError || !profile) {
          await clearAuthAndGoHome();
          return;
        }
      } catch (err) {
        console.error("[AuthProvider] syncAuthAndProfile failed:", err);
        await clearAuthAndGoHome();
      } finally {
        setLoading(false);
        isSyncing = false;
      }
    };

    const init = async () => {
      await syncAuthAndProfile();
    };

    void init();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncAuthAndProfile();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      await syncAuthAndProfile();
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, router]);

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
