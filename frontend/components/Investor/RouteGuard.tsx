'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/utils/supabase/getProfile';

export default function InvestorRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    getUserRole().then((role) => {
      if (!role) {
        router.replace('/homepage');
      } else if (role === 'owner') {
        router.replace('/dashboard');
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181A2A]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#6f42c1] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Checking access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
