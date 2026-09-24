'use client';

// frontend/components/bidding/BidCostModal.tsx
// Displays comprehensive settlement breakdown including token cost, protocol fee, and gas estimate

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  X,
  Fuel,
  Info,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Coins,
} from 'lucide-react';

// shafqaat implemented — Fix P2: Total cost modal with live gas estimation and 2% protocol fee breakdown
interface BidCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quantity: number;
  pricePerToken: number;
  tokenSymbol?: string;
  campaignTitle?: string;
  userWalletBalanceEth?: string | null;
  isLoading?: boolean;
  actionLabel?: string;
  isSettlement?: boolean; // true if confirming on-chain fillOrder, false if submitting off-chain bid
}

export default function BidCostModal({
  isOpen,
  onClose,
  onConfirm,
  quantity,
  pricePerToken,
  tokenSymbol = 'TOKENS',
  campaignTitle = 'Investment Campaign',
  userWalletBalanceEth,
  isLoading = false,
  actionLabel = 'Confirm Transaction',
  isSettlement = false,
}: BidCostModalProps) {
  const [estimatedGasEth, setEstimatedGasEth] = useState<string>('0.0018');
  const [ethPriceUsd, setEthPriceUsd] = useState<number>(3200);
  const [gasLoading, setGasLoading] = useState<boolean>(false);

  const subtotalEth = Number(quantity) * Number(pricePerToken);
  const platformFeeBps = 200; // 2% platform fee
  const platformFeeEth = (subtotalEth * platformFeeBps) / 10000;
  const gasEth = isSettlement ? parseFloat(estimatedGasEth || '0.002') : 0;
  const totalEth = subtotalEth + gasEth;

  const subtotalUsd = subtotalEth * ethPriceUsd;
  const platformFeeUsd = platformFeeEth * ethPriceUsd;
  const gasUsd = gasEth * ethPriceUsd;
  const totalUsd = totalEth * ethPriceUsd;

  const hasInsufficientBalance =
    userWalletBalanceEth != null &&
    parseFloat(userWalletBalanceEth) < totalEth;

  useEffect(() => {
    if (!isOpen) return;

    // Fetch Sepolia/mainnet gas price estimate
    let cancelled = false;
    async function fetchGas() {
      if (!isSettlement || typeof window === 'undefined' || !window.ethereum) return;
      try {
        setGasLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('25', 'gwei');
        // fillOrder typical execution: ~120,000 gas units
        const estimatedUnits = BigInt(125000);
        const totalGasWei = gasPrice * estimatedUnits;
        if (!cancelled) {
          setEstimatedGasEth(parseFloat(ethers.formatEther(totalGasWei)).toFixed(5));
        }
      } catch (err) {
        console.warn('[BidCostModal] Could not estimate gas:', err);
      } finally {
        if (!cancelled) setGasLoading(false);
      }
    }

    fetchGas();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isSettlement]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isSettlement ? 'Review On-Chain Settlement' : 'Bid Cost Summary'}
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                {campaignTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cost Breakdown Cards */}
        <div className="py-5 space-y-3">
          <div className="rounded-xl p-4 bg-muted/40 border border-border/50 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tokens Requested</span>
              <span className="font-semibold text-foreground">
                {quantity.toLocaleString()} {tokenSymbol}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price per Token</span>
              <span className="font-semibold text-foreground">
                {pricePerToken} ETH
              </span>
            </div>

            <div className="h-px bg-border/40 my-1" />

            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-foreground">Token Purchase Subtotal</span>
              <div className="text-right">
                <span className="text-foreground">{subtotalEth.toFixed(6)} ETH</span>
                <span className="block text-[11px] text-muted-foreground">
                  ≈ ${subtotalUsd.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Fees breakdown */}
          <div className="rounded-xl p-4 bg-muted/20 border border-border/50 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Marketplace Platform Fee (2.0%)
              </span>
              <div className="text-right">
                <span className="font-medium text-foreground">{platformFeeEth.toFixed(6)} ETH</span>
                <span className="block text-[10px] text-muted-foreground">
                  (Deducted from trade)
                </span>
              </div>
            </div>

            {isSettlement && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-chart-4" />
                  Estimated Network Gas Fee
                </span>
                <div className="text-right">
                  {gasLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        ~{estimatedGasEth} ETH
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        ≈ ${gasUsd.toFixed(2)} USD
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Total Cost Display */}
          <div className="rounded-xl p-4 bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                Total Required ETH
              </span>
              <div className="text-xl font-black text-foreground mt-0.5">
                {totalEth.toFixed(6)} ETH
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Estimated USD</span>
              <div className="text-base font-bold text-foreground mt-0.5">
                ${totalUsd.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Wallet Balance Warning */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Insufficient Wallet Balance</p>
                <p className="text-[11px] opacity-90">
                  Your wallet has {userWalletBalanceEth} ETH, but {totalEth.toFixed(4)} ETH is required.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || hasInsufficientBalance}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                {actionLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
