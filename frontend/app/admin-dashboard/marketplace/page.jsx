import { createClient } from "@/utils/supabase/server";
import {
  ShoppingCart, Gavel, XCircle, CheckCircle2,
  Clock, AlertTriangle, ArrowLeftRight,
} from "lucide-react";
import { adminCancelTradeOrder } from "@/lib/action";
import Link from "next/link";

function StatusBadge({ status }) {
  const map = {
    open:             { label: "Open",       color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
    partially_filled: { label: "Partial",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    filled:           { label: "Filled",     color: "#a78bfa", bg: "rgba(167,139,250,0.1)"},
    cancelled:        { label: "Cancelled",  color: "#94a3b8", bg: "rgba(148,163,184,0.08)"},
    pending:          { label: "Pending",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    accepted:         { label: "Accepted",   color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    confirmed:        { label: "Confirming", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
    completed:        { label: "Completed",  color: "#4ade80", bg: "rgba(74,222,128,0.08)"},
    rejected:         { label: "Rejected",   color: "#f87171", bg: "rgba(248,113,113,0.1)"},
  };
  const style = map[status] ?? { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.08)" };
  return (
    <span
      className="inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-bold"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  );
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

export default async function AdminMarketplacePage() {
  const supabase = await createClient();

  // Active sell orders
  const { data: orders } = await supabase
    .from("token_orders")
    .select(`
      id, price, quantity, quantity_remaining, status, created_at,
      seller_wallet_address, seller_signature,
      campaigns:campaign_id ( id, title, category ),
      profiles:investor_id ( full_name )
    `)
    .eq("side", "sell")
    .in("status", ["open", "partially_filled"])
    .order("created_at", { ascending: false });

  // Recent bids (last 50)
  const { data: bids } = await supabase
    .from("token_bids")
    .select(`
      id, bid_price_per_token, quantity, status, created_at,
      buyer_wallet, accept_deadline, bid_expires_at, tx_hash,
      token_orders:listing_id (
        id,
        campaigns:campaign_id ( title )
      ),
      profiles:buyer_id ( full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  const activeOrders = orders ?? [];
  const allBids = bids ?? [];
  const activeBids = allBids.filter((b) => ["pending", "accepted", "confirmed"].includes(b.status));
  const completedBids = allBids.filter((b) => b.status === "completed");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
            <ArrowLeftRight className="text-[#a78bfa] h-8 w-8" />
            Marketplace Oversight
          </h1>
          <p className="text-gray-400 text-sm">Monitor all active sell orders and bids on the secondary market.</p>
        </div>
        <Link href="/admin-dashboard" className="text-sm text-[#a78bfa] hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Orders",    value: activeOrders.length,  icon: ShoppingCart, color: "#4ade80" },
          { label: "Active Bids",      value: activeBids.length,    icon: Gavel,        color: "#a78bfa" },
          { label: "Completed Trades", value: completedBids.length, icon: CheckCircle2, color: "#60a5fa" },
          { label: "Unsigned Orders",  value: activeOrders.filter(o => !o.seller_signature).length, icon: AlertTriangle, color: "#fbbf24" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a2030] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0" style={{ color }} />
            <div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Sell Orders */}
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="font-bold text-white">Active Sell Orders ({activeOrders.length})</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {activeOrders.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No active sell orders.</p>
            ) : (
              activeOrders.map((order) => (
                <div key={order.id} className="p-5 hover:bg-white/[0.02] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {order.campaigns?.title || "Campaign"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Seller: {order.profiles?.full_name || shortAddr(order.seller_wallet_address)}
                        &nbsp;·&nbsp;{order.quantity_remaining}/{order.quantity} tokens
                        &nbsp;·&nbsp;{order.price} ETH/token
                      </p>
                      {!order.seller_signature && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-yellow-500">
                          <AlertTriangle className="h-3 w-3" />
                          Unsigned — buyer cannot settle until seller signs
                        </p>
                      )}
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Emergency cancel */}
                  <div className="mt-3">
                    <form
                      action={async () => {
                        "use server";
                        await adminCancelTradeOrder(order.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel Order &amp; Bids
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Bids */}
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="font-bold text-white">Recent Bids ({allBids.length})</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {allBids.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No bids placed yet.</p>
            ) : (
              allBids.map((bid) => (
                <div key={bid.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {bid.token_orders?.campaigns?.title || "Token listing"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {bid.profiles?.full_name || shortAddr(bid.buyer_wallet)}
                      &nbsp;·&nbsp;{bid.quantity} tokens @ {bid.bid_price_per_token} ETH
                      {bid.status === "completed" && bid.tx_hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${bid.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[#a78bfa] hover:underline"
                        >
                          Tx ↗
                        </a>
                      )}
                    </p>
                    {bid.status === "accepted" && bid.accept_deadline && (
                      <p className="text-[10px] text-yellow-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        Deadline: {new Date(bid.accept_deadline).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={bid.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
