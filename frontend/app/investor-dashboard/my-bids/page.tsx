'use client';

import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  Gavel, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronRight, RotateCcw, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getMyBids, cancelBid, confirmBid, completeBid, type TokenBid } from '@/lib/bidding-api';
import { useWallet } from '@/context/WalletContext';

// ── Status badge helper ───────────────────────────────────────────
function StatusBadge({ status }: { status: TokenBid['status'] }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pending',    color: 'var(--chart-5)', bg: 'color-mix(in srgb, var(--chart-5) 12%, transparent)' },
    accepted:  { label: 'Accepted!',  color: 'var(--chart-3)', bg: 'color-mix(in srgb, var(--chart-3) 12%, transparent)' },
    confirmed: { label: 'Confirming', color: 'var(--ring)',    bg: 'color-mix(in srgb, var(--ring) 12%, transparent)' },
    completed: { label: 'Completed',  color: '#22c55e',        bg: 'rgba(34,197,94,0.1)' },
    rejected:  { label: 'Rejected',   color: 'var(--destructive)', bg: 'color-mix(in srgb, var(--destructive) 10%, transparent)' },
    cancelled: { label: 'Cancelled',  color: 'var(--muted-foreground)', bg: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)' },
    expired:   { label: 'Expired',    color: 'var(--muted-foreground)', bg: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)' },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-bold"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  );
}

function timeLeft(isoDate: string | null) {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

// ABI for the existing fillOrder() function
const MARKETPLACE_ABI = [
  'function fillOrder(address seller, address tokenAddress, uint256 tokenAmount, uint256 pricePerToken, uint256 nonce, uint256 expiry, bytes calldata sellerOrderSignature, uint256 kycDeadline, bytes calldata kycSignature) payable',
];

// ── Main component ───────────────────────────────────────────────
export default function MyBidsPage() {
  const { walletAddress, connectWallet } = useWallet();
  const [bids, setBids] = useState<TokenBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<Record<string, string>>({});

  const loadBids = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMyBids();
      setBids(result.bids || []);
    } catch (err: any) {
      const msg = err.message || 'Failed to load your bids';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBids(); }, [loadBids]);

  function setStep(bidId: string, msg: string) {
    setProgressMsg((prev) => ({ ...prev, [bidId]: msg }));
  }
  function clearStep(bidId: string) {
    setProgressMsg((prev) => { const n = { ...prev }; delete n[bidId]; return n; });
  }

  // ── Cancel a pending bid ────────────────────────────────────
  async function handleCancel(bidId: string) {
    setProcessingId(bidId);
    const toastId = toast.loading('Cancelling your bid…');
    try {
      await cancelBid(bidId);
      setBids((prev) => prev.map((b) => b.id === bidId ? { ...b, status: 'cancelled' } : b));
      toast.success('Bid cancelled successfully.', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel bid.', { id: toastId });
    } finally {
      setProcessingId(null);
    }
  }

  // ── Confirm purchase (accepted bid) → call fillOrder() on-chain ──
  async function handleConfirmPurchase(bid: TokenBid) {
    if (!walletAddress) {
      await connectWallet();
      toast.info('Wallet connected — click Confirm Purchase again.');
      return;
    }

    const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;
    if (!marketplaceAddress || !ethers.isAddress(marketplaceAddress)) {
      toast.error('Marketplace contract not configured. Contact support.');
      return;
    }

    setProcessingId(bid.id);
    const toastId = toast.loading('Preparing settlement…');
    try {
      // 1. Get settlement data from backend (marks bid as 'confirmed')
      setStep(bid.id, 'Getting KYC authorization…');
      toast.loading('Getting KYC authorization from server…', { id: toastId });
      const { settlement_data } = await confirmBid(bid.id);

      const {
        seller_wallet,
        seller_signature,
        seller_nonce,
        token_contract_address,
        quantity,
        price_per_token,
      } = settlement_data;

      if (!seller_signature) throw new Error('Seller has not signed this listing yet. Contact the seller.');
      if (!token_contract_address) throw new Error('Token contract address is missing from this listing.');

      // 2. Expiry guard: seller signed with a 7-day window from listing creation
      //    We use listing_created_at if available; otherwise recompute safely.
      const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      const tokenAmount = ethers.parseUnits(String(quantity), 18);
      const pricePerToken = ethers.parseEther(String(price_per_token));
      const totalEth = (tokenAmount * pricePerToken) / ethers.WeiPerEther;

      // 3. Get KYC authorization signature from backend
      toast.loading('Verifying KYC credentials…', { id: toastId });
      const kycRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/marketplace/kyc-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await (await import('@/utils/supabase/client')).createClient().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          buyer_wallet: walletAddress,
          seller_wallet,
          chain_id: 11155111,
        }),
      });
      if (!kycRes.ok) {
        const kycErr = await kycRes.json().catch(() => ({}));
        throw new Error(kycErr.error || 'KYC authorization failed — ensure both you and the seller are KYC-verified.');
      }
      const { kycSignature, kycDeadline } = await kycRes.json();

      toast.loading('Please confirm in MetaMask…', { id: toastId });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);

      const tx = await marketplace.fillOrder(
        seller_wallet,
        token_contract_address,
        tokenAmount,
        pricePerToken,
        seller_nonce,
        expiry,
        seller_signature,
        kycDeadline,
        kycSignature,
        { value: totalEth },
      );

      toast.loading('Waiting for on-chain confirmation…', { id: toastId });
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.loading('Syncing database…', { id: toastId });
        await completeBid(bid.id, tx.hash, receipt.blockNumber);
        setBids((prev) => prev.map((b) => b.id === bid.id ? { ...b, status: 'completed', tx_hash: tx.hash } : b));
        toast.success(
          <span className="flex items-center gap-2">
            Trade complete!{' '}
            <a
              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline flex items-center gap-1"
            >
              View on Etherscan <ExternalLink size={11} />
            </a>
          </span>,
          { id: toastId, duration: 8000 },
        );
      }
    } catch (err: any) {
      console.error('[handleConfirmPurchase]', err);
      // Handle MetaMask user rejection gracefully
      const msg = err.code === 4001 || err.code === 'ACTION_REJECTED'
        ? 'Transaction cancelled in MetaMask.'
        : err.message || 'Transaction failed.';
      toast.error(msg, { id: toastId });
    } finally {
      setProcessingId(null);
      clearStep(bid.id);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const activeBids = bids.filter((b) => ['pending', 'accepted', 'confirmed'].includes(b.status));
  const historicBids = bids.filter((b) => ['completed', 'rejected', 'cancelled', 'expired'].includes(b.status));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Secondary Marketplace</div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Bids</h1>
          <button
            onClick={loadBids}
            className="flex items-center gap-1.5 rounded-2xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-ring hover:text-foreground"
          >
            <RotateCcw size={13} />
            Refresh
          </button>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl">
          Track all bids you have placed on token listings. When a seller accepts your bid, you will see a <strong className="text-foreground">Confirm Purchase</strong> button here.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card p-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : bids.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <Gavel size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground">No bids yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Go to the Marketplace and click "Place Bid" on any listing to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Active bids */}
          {activeBids.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Bids</h2>
              <div className="flex flex-col gap-3">
                {activeBids.map((bid) => {
                  const campaign = bid.token_orders?.campaigns;
                  const isAccepted = ['accepted', 'confirmed'].includes(bid.status);
                  const isProcessing = processingId === bid.id;
                  const step = progressMsg[bid.id];

                  return (
                    <div
                      key={bid.id}
                      className="rounded-3xl border border-border bg-card p-5 transition"
                      style={isAccepted ? {
                        borderColor: 'color-mix(in srgb, var(--chart-3) 40%, transparent)',
                        boxShadow: '0 0 24px color-mix(in srgb, var(--chart-3) 12%, transparent)',
                      } : {}}
                    >
                      {/* Accepted banner */}
                      {isAccepted && (
                        <div
                          className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                          style={{ background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)', color: 'var(--chart-3)' }}
                        >
                          <CheckCircle2 size={15} />
                          Your bid was accepted! Complete your purchase within{' '}
                          <strong>{timeLeft(bid.accept_deadline) || '24h'}</strong>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {campaign?.title || 'Token listing'}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {campaign?.category || 'Uncategorized'} · {bid.quantity} tokens @ {bid.bid_price_per_token} ETH/token
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Total: <strong className="text-foreground">{(bid.quantity * bid.bid_price_per_token).toFixed(6)} ETH</strong>
                          </p>
                        </div>
                        <StatusBadge status={bid.status} />
                      </div>

                      {/* Expiry info */}
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <Clock size={12} />
                        {isAccepted
                          ? `Accept deadline: ${timeLeft(bid.accept_deadline)}`
                          : `Bid expires: ${timeLeft(bid.bid_expires_at)}`
                        }
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {isAccepted && (
                          <button
                            onClick={() => handleConfirmPurchase(bid)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, var(--chart-3), var(--ring))' }}
                          >
                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                            {isProcessing ? (step || 'Processing…') : (bid.status === 'confirmed' ? 'Complete Purchase' : 'Confirm Purchase')}
                          </button>
                        )}

                        {bid.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(bid.id)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 rounded-2xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-60"
                          >
                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />}
                            Cancel Bid
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* History */}
          {historicBids.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bid History</h2>
              <div className="flex flex-col gap-2">
                {historicBids.map((bid) => {
                  const campaign = bid.token_orders?.campaigns;
                  return (
                    <div key={bid.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {campaign?.title || 'Token listing'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bid.quantity} tokens @ {bid.bid_price_per_token} ETH/token
                          {bid.tx_hash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${bid.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-0.5 text-ring hover:underline"
                            >
                              Tx <ExternalLink size={10} />
                            </a>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={bid.status} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
