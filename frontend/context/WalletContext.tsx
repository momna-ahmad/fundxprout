'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────
export type WalletContextType = {
  walletAddress: string | null;
  network: number | null;
  isConnecting: boolean;
  isWalletVerified: boolean;
  connectWallet: () => Promise<void>;
  connectMetaMask: () => Promise<void>;
  signVerificationMessage: () => Promise<void>;
  disconnect: () => void;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ── Context ──────────────────────────────────────────────────────────
// const WalletContext = createContext<WalletContextType>({
//   walletAddress: null,
//   network: null,
//   isConnecting: false,
//   connectWallet: async () => {},
// });
const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  network: null,
  isConnecting: false,
  isWalletVerified: false,

  connectWallet: async () => {},
  connectMetaMask: async () => {},
  signVerificationMessage: async () => {},
  disconnect: () => {},
});

// ── Provider ─────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletVerified, setIsWalletVerified] = useState(false);

  async function fetchWalletVerification(address: string) {
    try {
      const response = await fetch(`/api/wallet/status?address=${encodeURIComponent(address)}`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.wallet_verified === true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    // Auto-detect already-connected accounts on mount
    async function checkConnection() {
      if (typeof window === 'undefined' || !window.ethereum) return;
      try {
        const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
          setNetwork(parseInt(chainId, 16));
          setIsWalletVerified(await fetchWalletVerification(address));
        }
      } catch {
        // MetaMask not accessible
      }
    }
    checkConnection();

    // Live listeners for account / network changes
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setIsWalletVerified(await fetchWalletVerification(address));
      } else {
        setWalletAddress(null);
        setNetwork(null);
        setIsWalletVerified(false);
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
      const address = accounts[0];
      setWalletAddress(address);
      const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
      setNetwork(parseInt(chainId, 16));
      setIsWalletVerified(await fetchWalletVerification(address));
    } catch {
      // User rejected the request
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    await connectWallet();
  };

  const signVerificationMessage = async () => {
    if (typeof window === 'undefined' || !window.ethereum || !walletAddress) {
      throw new Error('MetaMask is not connected');
    }

    const response = await fetch('/api/wallet/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress }),
    });

    if (!response.ok) {
      throw new Error('Unable to get verification nonce');
    }

    const { nonce } = await response.json();
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [nonce, walletAddress],
    });

    const linkResponse = await fetch('/api/wallet/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletAddress, signature }),
    });

    if (!linkResponse.ok) {
      const error = await linkResponse.json();
      throw new Error(error?.error || 'Unable to link wallet');
    }

    const data = await linkResponse.json();
    setIsWalletVerified(data.wallet_verified === true);
  };

  const disconnect = () => {
    setWalletAddress(null);
    setNetwork(null);
    setIsWalletVerified(false);
  };


  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        network,
        isConnecting,
        isWalletVerified,
        connectWallet,
        connectMetaMask,
        signVerificationMessage,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export const useWallet = () => useContext(WalletContext);