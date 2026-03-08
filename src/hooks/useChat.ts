import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DmConversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
  other_user?: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
  unread_count?: number;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_delivered: boolean;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: convos } = await supabase
      .from('dm_conversations')
      .select('*')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!convos) { setConversations([]); setIsLoading(false); return; }

    const otherIds = convos.map(c => c.participant1_id === user.id ? c.participant2_id : c.participant1_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', otherIds);

    const enriched = await Promise.all(convos.map(async (c) => {
      const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
      const profile = profiles?.find(p => p.user_id === otherId);

      const { data: lastMsg } = await supabase
        .from('dm_messages')
        .select('content')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabase
        .from('dm_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      return {
        ...c,
        other_user: profile || { user_id: otherId, username: null, avatar_url: null },
        last_message: lastMsg?.content,
        unread_count: count || 0,
      };
    }));

    setConversations(enriched);
    setIsLoading(false);
  }, [user]);

  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    const { data: existing } = await supabase
      .from('dm_conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
      )
      .single();

    if (existing) return existing.id;

    const { data: newConvo, error } = await supabase
      .from('dm_conversations')
      .insert({ participant1_id: user.id, participant2_id: otherUserId })
      .select('id')
      .single();

    if (error) { toast.error('Failed to start conversation'); return null; }
    return newConvo.id;
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string): Promise<DmMessage[]> => {
    const { data } = await supabase
      .from('dm_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    return (data || []) as DmMessage[];
  }, []);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: string = 'text',
    fileUrl?: string,
    fileName?: string,
  ) => {
    if (!user || (!content.trim() && !fileUrl)) return;

    const { error } = await supabase
      .from('dm_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || fileName || 'Attachment',
        message_type: messageType,
        file_url: fileUrl || null,
        file_name: fileName || null,
        is_delivered: false,
        is_read: false,
      });

    if (error) { toast.error('Failed to send message'); return; }

    await supabase
      .from('dm_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }, [user]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    // Mark as both delivered and read
    await supabase
      .from('dm_messages')
      .update({ is_read: true, is_delivered: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', user.id);
  }, [user]);

  const markAsDelivered = useCallback(async (conversationId: string) => {
    if (!user) return;
    await supabase
      .from('dm_messages')
      .update({ is_delivered: true })
      .eq('conversation_id', conversationId)
      .eq('is_delivered', false)
      .neq('sender_id', user.id);
  }, [user]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; name: string } | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file);

    if (error) { toast.error('Failed to upload file'); return null; }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(path);

    return { url: publicUrl, name: file.name };
  }, [user]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Auto-mark messages as delivered when conversations load (user is active)
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Mark all unread messages as delivered when user is active
  useEffect(() => {
    if (!user) return;
    conversations.forEach(c => {
      if (c.unread_count && c.unread_count > 0) {
        markAsDelivered(c.id);
      }
    });
  }, [conversations, user, markAsDelivered]);

  return {
    conversations,
    isLoading,
    totalUnread,
    loadConversations,
    getOrCreateConversation,
    loadMessages,
    sendMessage,
    markAsRead,
    markAsDelivered,
    uploadFile,
  };
}
