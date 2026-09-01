'use client';
import { ReactNode } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function ConnectWalletGate({ children }: { children: ReactNode }) {
  const { walletAddress, isWalletVerified, connectMetaMask } = useWallet();

  if (!walletAddress) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 text-center">
        <div className="text-sm font-semibold text-foreground mb-2">Connect your wallet</div>
        <div className="text-xs text-muted-foreground mb-5">MetaMask is required to submit orders and participate in the campaign marketplace.</div>
        <button
          type="button"
          onClick={connectMetaMask}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground bg-muted hover:bg-card transition"
        >
          <Wallet size={16} /> Connect MetaMask
        </button>
      </div>
    );
  }

  if (!isWalletVerified) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 text-center">
        <div className="text-sm font-semibold text-foreground mb-2">Wallet signing required</div>
        <div className="text-xs text-muted-foreground mb-5">Your wallet must be linked and verified before placing orders. Use the verification flow in your profile.</div>
        <button
          type="button"
          onClick={connectMetaMask}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground bg-muted hover:bg-card transition"
        >
          <ArrowRight size={16} /> Reconnect Wallet
        </button>
      </div>
    );
  }

  return <>{children}</>;
}