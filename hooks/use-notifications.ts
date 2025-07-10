'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Notification = Database['public']['Tables']['notifications']['Row'];
type UserMessage = Database['public']['Tables']['user_messages']['Row'] & {
  sender: Database['public']['Tables']['profiles']['Row'];
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchMessages();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_messages')
        .select(`
          *,
          sender:profiles!user_messages_sender_id_fkey(*)
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setMessages(data || []);
      setUnreadMessagesCount(data?.filter(m => !m.read).length || 0);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Update unread count
          if (updatedNotification.read && !payload.old.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (!updatedNotification.read && payload.old.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            sender: sender || null
          } as UserMessage;

          setMessages(prev => [messageWithSender, ...prev]);
          setUnreadMessagesCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedMessage = payload.new;
          setMessages(prev => 
            prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
          );
          
          // Update unread count
          if (updatedMessage.read && !payload.old.read) {
            setUnreadMessagesCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('user_messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const markAllMessagesAsRead = async () => {
    try {
      const { error } = await supabase
        .from('user_messages')
        .update({ read: true })
        .eq('recipient_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      
      setUnreadMessagesCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return {
    notifications,
    messages,
    unreadCount,
    unreadMessagesCount,
    loading,
    markNotificationAsRead,
    markMessageAsRead,
    markAllNotificationsAsRead,
    markAllMessagesAsRead,
    deleteNotification,
    refetch: () => {
      fetchNotifications();
      fetchMessages();
    }
  };
}