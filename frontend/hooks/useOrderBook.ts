import { io, type Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { getOrderBook } from '@/lib/marketplace-api';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type OrderBookEntry = { price: number; quantity: number; total: number };
export type TradeEvent = {
  id: string; side: 'buy' | 'sell'; price: number; quantity: number;
  total: number; buyer?: string; seller?: string; timestamp?: string;
};
export type OrderBookSnapshot = { bids: OrderBookEntry[]; asks: OrderBookEntry[] };

const DEFAULT_BOOK: OrderBookSnapshot = { bids: [], asks: [] };

export function useOrderBook(campaignId: string | undefined) {
  const [book, setBook] = useState<OrderBookSnapshot>(DEFAULT_BOOK);
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!campaignId || typeof window === 'undefined') return;

    // 1. Fetch initial HTTP snapshot
    getOrderBook(campaignId)
      .then((data) => {
        if (data && (data.bids || data.asks)) {
          setBook({
            bids: data.bids || [],
            asks: data.asks || [],
          });
        }
      })
      .catch((err) => console.warn('[useOrderBook] HTTP snapshot fetch warning:', err));

    // 2. Connect WebSocket for live updates
    const socket: Socket = io(`${SOCKET_URL}/marketplace`, {
      autoConnect: false,
      transports: ['websocket'],
    });

    const onBookUpdate = (payload: { campaignId: string; snapshot: OrderBookSnapshot }) => {
      if (String(payload.campaignId) !== String(campaignId)) return;
      setBook(payload.snapshot ?? DEFAULT_BOOK);
    };
    const onTradeExecuted = (payload: { campaignId: string; trade: TradeEvent }) => {
      if (String(payload.campaignId) !== String(campaignId)) return;
      setRecentTrades((prev) => [payload.trade, ...prev].slice(0, 20));
    };

    socket.connect();
    socket.emit('joinCampaign', campaignId);
    socket.on('bookUpdate', onBookUpdate);
    socket.on('tradeExecuted', onTradeExecuted);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.emit('leaveCampaign', campaignId);
      socket.off('bookUpdate', onBookUpdate);
      socket.off('tradeExecuted', onTradeExecuted);
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [campaignId]);

  return { book, recentTrades, connected };
}