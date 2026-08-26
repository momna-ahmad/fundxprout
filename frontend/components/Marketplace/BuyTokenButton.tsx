'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import type { MarketplaceSellOrder } from '@/lib/marketplace-api';

const SECONDARY_MARKETPLACE_ABI = [
  'function settleTrade(bytes32 tradeId, address token, address seller, uint256 amount, uint256 pricePerToken) payable',
];

export default function BuyTokenButton({ order, onPurchased }: { order: MarketplaceSellOrder; onPurchased?: (orderId: string) => void }) {
  const { walletAddress, connectWallet } = useWallet();
  const [message, setMessage] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  //validate on chain state whether order has already been filled
  async function buy() {
    setMessage(null);
    if (!walletAddress) {
      await connectWallet();
      setMessage('Wallet connected. Click Buy token again to confirm the purchase.');
      return;
    }

    const tokenAddress = order.campaign?.token_contract_address;
    const sellerAddress = order.seller_wallet_address;
    const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;
    if (!marketplaceAddress || !ethers.isAddress(marketplaceAddress)) return setMessage('Marketplace contract address is not configured.');
    if (!tokenAddress || !ethers.isAddress(tokenAddress) || !sellerAddress || !ethers.isAddress(sellerAddress)) {
      return setMessage('This listing is missing a valid token or seller wallet address.');
    }
    if (!window.ethereum) return setMessage('Please install MetaMask.');

    try {
      setBuying(true);
      const amount = ethers.parseUnits(String(order.quantity_remaining), 18);
      const pricePerToken = ethers.parseEther(String(order.price));
      if (amount <= BigInt(0) || pricePerToken <= BigInt(0)) throw new Error('This listing has an invalid price or quantity.');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, SECONDARY_MARKETPLACE_ABI, signer);
      const total = (amount * pricePerToken) / ethers.WeiPerEther;

      setMessage('Confirm the transaction in MetaMask…');
      // Hashing the immutable Supabase order UUID gives the contract a stable,
      // unique bytes32 trade id and prevents this listing from settling twice.
      const tx = await marketplace.settleTrade(
        ethers.id(order.id),
        tokenAddress,
        sellerAddress,
        amount,
        pricePerToken,
        { value: total },
      );
      setMessage('Waiting for on-chain confirmation…');
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setMessage('Syncing database records…');

        // Record off-chain ownership transfer
        await fetch('/api/marketplace/settleTrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            tx_hash: tx.hash,
            amount_bought: order.quantity_remaining,
          }),
        });
      }

      // 2. Prompt MetaMask to add and display the token in buyer's wallet UI
        try {
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: tokenAddress,
                symbol: order.token_symbol || 'TOKEN',
                decimals: 18,
              },
            },
          });
        } catch (watchErr) {
          // Non-blocking: if user dismisses prompt, tokens are still safe in their wallet
          console.log('User dismissed token import prompt:', watchErr);
        }

      setMessage(`Purchase confirmed: ${tx.hash.slice(0, 10)}…`);
      onPurchased?.(order.id);
    } catch (error) {
      console.error('Token purchase failed:', error);
      setMessage(error instanceof Error ? error.message : 'Token purchase failed.');
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={buy} disabled={buying} className="inline-flex w-full items-center justify-center rounded-2xl bg-ring px-4 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60">
        {buying ? 'Purchasing…' : 'Buy token'}
      </button>
      {message && <p className="text-xs leading-5 text-muted-foreground">{message}</p>}
    </div>
  );
}
