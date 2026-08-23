'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ── Types ────────────────────────────────────────────────────────────
export type WalletContextType = {
  walletAddress: string | null;
  network: number | null;
  isConnecting: boolean;
  isWalletVerified: boolean;
  connectWallet: () => Promise<string | null>;
  connectMetaMask: () => Promise<string | null>;
  signVerificationMessage: (address?: string) => Promise<string>;
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

  connectWallet: async () => null,
  connectMetaMask: async () => null,
  signVerificationMessage: async () => '',
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
      const response = await fetch(`${API_BASE}/api/wallet/status?address=${encodeURIComponent(address)}`);
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
      return null;
    }
    try {
      setIsConnecting(true);
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setWalletAddress(address);
      const chainId: string = await window.ethereum.request({ method: 'eth_chainId' });
      setNetwork(parseInt(chainId, 16));
      setIsWalletVerified(await fetchWalletVerification(address));
      return address;
    } catch {
      // User rejected the request
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectMetaMask = async () => {
    return connectWallet();
  };

  const signVerificationMessage = async (addressToVerify = walletAddress) => {
    if (typeof window === 'undefined' || !window.ethereum || !addressToVerify) {
      throw new Error('MetaMask is not connected');
    }

    // The selected MetaMask account can change after React has rendered. Read
    // it again and use that same address for the nonce, signature and link
    // request so the server can verify ownership reliably.
    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
    const signingAddress = accounts[0];
    if (!signingAddress) throw new Error('No MetaMask account is available');
    setWalletAddress(signingAddress);

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Please sign in before verifying your wallet');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(`${API_BASE}/api/wallet/nonce`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ address: signingAddress }),
    });

    if (!response.ok) {
      throw new Error('Unable to get verification nonce');
    }

    const { nonce } = await response.json();
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [nonce, signingAddress],
    });

    const linkResponse = await fetch(`${API_BASE}/api/wallet/link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ address: signingAddress, signature }),
    });

    if (!linkResponse.ok) {
      const error = await linkResponse.json();
      throw new Error(error?.error || 'Unable to link wallet');
    }

    const data = await linkResponse.json();
    if (data.wallet_address) setWalletAddress(data.wallet_address);
    setIsWalletVerified(data.wallet_verified === true);
    return data.wallet_address || signingAddress;
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
