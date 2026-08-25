'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { createOrder, validateSellOrderBalance } from '@/lib/marketplace-api';
import { useAuth } from '@/context/auth-context';

const ERC20_ABI = ['function approve(address spender, uint256 value) returns (bool)'];

type OrderFormProps = {
  campaignId: string;
  tokenAddress?: string | null;
  defaultSide?: 'buy' | 'sell';
};

export default function OrderForm({ campaignId, tokenAddress, defaultSide = 'buy' }: OrderFormProps) {
  const { walletAddress, connectWallet } = useWallet();
  const [side, setSide] = useState<'buy' | 'sell'>(defaultSide);
  const { user } = useAuth();
  console.log('OrderForm user:', user);
  const [price, setPrice] = useState('0.001');
  const [quantity, setQuantity] = useState('1');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;

  //validate the available tokens against listed sell orders before approving metamask transaction to prevent gas fees for failed transactions.


  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!walletAddress) {
      await connectWallet();
      return;
    }
    if (!window.ethereum) return setStatusMessage('Please install MetaMask.');
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) return setStatusMessage('This campaign does not have a valid token contract address.');

    try {
      setIsSubmitting(true);
      const amount = ethers.parseUnits(quantity, 18);
      const pricePerToken = ethers.parseEther(price);
      if (amount <= BigInt(0) || pricePerToken <= BigInt(0)) throw new Error('Price and quantity must be greater than zero.');

      if (side === 'sell') {

        // Note: Ensure user_id/investor_id matches your DB user format (UUID or walletAddress)
        const validation = await validateSellOrderBalance(user!.id, campaignId, amount);
        console.log('Sell order validation result:', validation);
      
        if (!validation.isValid) {
          setStatusMessage(validation.error || 'Insufficient available tokens.');
          setIsSubmitting(false);
          return; // Halts execution cleanly without triggering the Next.js dev overlay
        }
      
        if (!marketplaceAddress || !ethers.isAddress(marketplaceAddress)) {
          throw new Error('Marketplace contract address is not configured.');
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setStatusMessage('Approve the marketplace to transfer tokens only after a matched sale…');
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const approval = await token.approve(marketplaceAddress, amount);
        await approval.wait();
      }

      setStatusMessage('Saving order to the marketplace…');
      await createOrder({ campaign_id: campaignId, side, price: Number(price), quantity: Number(quantity) }, walletAddress);
      setStatusMessage('Order saved. Blockchain settlement happens when a matching buyer confirms the trade.');
    } catch (error) {
      console.error('On-chain order failed:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Order transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-5">
        <div className="text-sm font-semibold text-foreground">Place a marketplace order</div>
        <p className="mt-1 text-xs text-muted-foreground">Orders are stored in the marketplace book. A sell order approves tokens but leaves them in your wallet until an on-chain match settles.</p>
      </div>
      <form className="space-y-4" onSubmit={placeOrder}>
        <label className="block text-xs font-semibold text-muted-foreground">Side
          <select value={side} onChange={(event) => setSide(event.target.value as 'buy' | 'sell')} className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="buy">Buy</option><option value="sell">Sell</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted-foreground">Price per token (ETH)
            <input required type="number" min="0" step="any" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">Quantity
            <input required type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
        </div>
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-3xl bg-ring px-4 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Submitting…' : `Place ${side} order`}
        </button>
        {statusMessage && <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground">{statusMessage}</div>}
      </form>
    </div>
  );
}
