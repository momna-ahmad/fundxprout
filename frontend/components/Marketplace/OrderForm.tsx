'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';

const MARKETPLACE_ABI = [
  'function createSellOrder(address token, uint256 amount, uint256 pricePerToken) returns (uint256)',
  'function createBuyOrder(address token, uint256 amount, uint256 pricePerToken) payable returns (uint256)',
];
const ERC20_ABI = ['function approve(address spender, uint256 value) returns (bool)'];

type OrderFormProps = {
  campaignId: string;
  tokenAddress?: string | null;
  defaultSide?: 'buy' | 'sell';
};

export default function OrderForm({ tokenAddress, defaultSide = 'buy' }: OrderFormProps) {
  const { walletAddress, connectWallet } = useWallet();
  const [side, setSide] = useState<'buy' | 'sell'>(defaultSide);
  const [price, setPrice] = useState('0.001');
  const [quantity, setQuantity] = useState('1');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    if (!walletAddress) {
      await connectWallet();
      return;
    }
    if (!window.ethereum) return setStatusMessage('Please install MetaMask.');
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) return setStatusMessage('This campaign does not have a valid token contract address.');
    if (!marketplaceAddress || !ethers.isAddress(marketplaceAddress)) return setStatusMessage('Marketplace contract address is not configured.');

    try {
      setIsSubmitting(true);
      const amount = ethers.parseUnits(quantity, 18);
      const pricePerToken = ethers.parseEther(price);
      if (amount <= 0n || pricePerToken <= 0n) throw new Error('Price and quantity must be greater than zero.');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);

      if (side === 'sell') {
        setStatusMessage('Approve the marketplace to escrow your tokens…');
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const approval = await token.approve(marketplaceAddress, amount);
        await approval.wait();
        setStatusMessage('Confirm the on-chain sell order…');
        const tx = await marketplace.createSellOrder(tokenAddress, amount, pricePerToken);
        await tx.wait();
      } else {
        const escrow = (amount * pricePerToken) / ethers.WeiPerEther;
        setStatusMessage('Confirm the on-chain buy order and ETH escrow…');
        const tx = await marketplace.createBuyOrder(tokenAddress, amount, pricePerToken, { value: escrow });
        await tx.wait();
      }

      setStatusMessage('Order created on-chain successfully.');
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
        <div className="text-sm font-semibold text-foreground">Place an on-chain marketplace order</div>
        <p className="mt-1 text-xs text-muted-foreground">Buy orders escrow ETH; sell orders escrow campaign tokens in the marketplace contract.</p>
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
          {isSubmitting ? 'Waiting for MetaMask…' : `Create on-chain ${side} order`}
        </button>
        {statusMessage && <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground">{statusMessage}</div>}
      </form>
    </div>
  );
}
