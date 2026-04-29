'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────
export type WalletContextType = {
  walletAddress: string | null;
  network: number | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ── Context ──────────────────────────────────────────────────────────
const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  network: null,
  isConnecting: false,
  connectWallet: async () => {},
});

// ── Provider ─────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Auto-detect already-connected accounts on mount
    async function checkConnection() {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
          setNetwork(parseInt(chainId, 16));
        }
      } catch {
        // MetaMask not accessible
      }
    }
    checkConnection();

    // Live listeners for account / network changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
        setNetwork(null);
      }
    };

    const handleChainChanged = (chainId: string) => {
      setNetwork(parseInt(chainId, 16));
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask to connect your wallet.');
      return;
    }
    try {
      setIsConnecting(true);
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
      setNetwork(parseInt(chainId, 16));
    } catch {
      // User rejected the request
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <WalletContext.Provider value={{ walletAddress, network, isConnecting, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export const useWallet = () => useContext(WalletContext);