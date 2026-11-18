'use client';
// frontend/hooks/useNotifications.ts
// Connects to the private Socket.IO /notifications namespace and fetches notification history.

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      let loaded = false;
      try {
        const res = await fetch(`${API_BASE}/api/notifications?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const { notifications: data, unreadCount: count } = await res.json();
          setNotifications(data || []);
          setUnreadCount(count || 0);
          loaded = true;
        }
      } catch { /* fallback to direct Supabase query */ }

      if (!loaded && sessionData.session?.user?.id) {
        const { data: dbNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (dbNotifs) {
          setNotifications(dbNotifs as AppNotification[]);
          setUnreadCount(
            (dbNotifs as AppNotification[]).filter((n) => !n.is_read).length,
          );
        }
      }
    } catch { /* silent */ }
  }, []);

  // Connect socket and Supabase Realtime subscription
  useEffect(() => {
    let cancelled = false;
    let userId: string | null = null;
    let channel: RealtimeChannel | null = null;
    let socket: Socket | null = null;
    const supabase = createClient();

    const connect = async () => {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
      if (!userId || cancelled) return;

      await fetchNotifications();
      if (cancelled) return;

      // 1. Socket.IO connection
      socket = io(`${API_BASE}/notifications`, {
        transports: ['websocket'],
        autoConnect: false,
      });

      socket.connect();
      socket.emit('joinUserRoom', userId);

      socket.on('newNotification', (notification: AppNotification) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current = socket;

      // 2. Supabase Realtime DB Trigger subscription
      channel = supabase.channel(
        `user_notifications_${userId}_${crypto.randomUUID()}`,
      );
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        },
      );
      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[useNotifications] Realtime subscription failed');
        }
      });
    };

    void connect();

    return () => {
      cancelled = true;
      if (socket && userId) {
        socket.emit('leaveUserRoom', userId);
        socket.disconnect();
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
      }
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [fetchNotifications]);


  const markAllRead = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }, []);

  return { notifications, unreadCount, markAllRead, markOneRead, refetch: fetchNotifications };
}
