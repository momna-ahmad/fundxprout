// app/investor-dashboard/layout.tsx
// Wraps all dashboard routes with WalletProvider + Sidebar + Navbar
import { WalletProvider } from '@/context/WalletContext';
import Sidebar from '@/components/Investor/Sidebar';
import Navbar from '@/components/Investor/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="flex min-h-screen bg-[#181A2A]">
        <Sidebar />
        <div className="ml-[220px] flex flex-1 flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 px-7 py-8 bg-[#181A2A] overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </WalletProvider>
  );
}