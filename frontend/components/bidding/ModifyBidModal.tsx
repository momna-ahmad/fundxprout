'use client';

// frontend/components/bidding/ModifyBidModal.tsx
// Modal allowing buyers to increase their offer price or adjust quantity on a pending bid

import { useState } from 'react';
import { X, ArrowUpCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { modifyBid, type TokenBid } from '@/lib/bidding-api';

// shafqaat implemented — Fix P3: Modal for modifying pending bids (increasing offer price)
interface ModifyBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  bid: TokenBid | null;
  onSuccess: () => void;
}

export default function ModifyBidModal({
  isOpen,
  onClose,
  bid,
  onSuccess,
}: ModifyBidModalProps) {
  const [newPrice, setNewPrice] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !bid) return null;

  const currentPrice = Number(bid.bid_price_per_token);
  const currentQuantity = Number(bid.quantity);
  const priceVal = newPrice ? parseFloat(newPrice) : currentPrice;
  const qtyVal = newQuantity ? parseFloat(newQuantity) : currentQuantity;
  const isHigherPrice = priceVal > currentPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bid) return;

    if (!isHigherPrice && qtyVal === currentQuantity) {
      toast.error('New offer price must be higher than your current price.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await modifyBid(bid.id, {
        new_bid_price_per_token: priceVal > currentPrice ? priceVal : undefined,
        new_quantity: qtyVal !== currentQuantity ? qtyVal : undefined,
      });

      toast.success(res.message || 'Bid updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bid');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Increase Your Bid Offer</h2>
              <p className="text-xs text-muted-foreground">
                {bid.token_orders?.campaigns?.title || 'Listing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Current Offer:</span>
              <span className="font-semibold text-foreground">{currentPrice} ETH/token</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Current Quantity:</span>
              <span className="font-semibold text-foreground">{currentQuantity} tokens</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Current Total:</span>
              <span className="font-semibold text-foreground">{(currentPrice * currentQuantity).toFixed(6)} ETH</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              New Bid Price per Token (ETH) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="any"
              min={currentPrice + 0.000001}
              placeholder={`Must be > ${currentPrice}`}
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Increasing your offer moves you higher in the seller's review queue.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Quantity (Optional update)
            </label>
            <input
              type="number"
              step="any"
              min="1"
              placeholder={String(currentQuantity)}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {priceVal > currentPrice && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">New Total Outlay:</span>
              <span className="font-bold text-primary">
                {(priceVal * qtyVal).toFixed(6)} ETH
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isHigherPrice}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Submit Increased Offer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
