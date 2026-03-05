import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Users, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

interface GroupMember {
  user_id: string;
  role: string;
  username?: string;
  avatar_url?: string | null;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
}

interface GroupChatWindowProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

export function GroupChatWindow({ groupId, groupName, onBack }: GroupChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMembers = async () => {
      const { data: mems } = await supabase
        .from('group_members' as any)
        .select('user_id, role')
        .eq('group_id', groupId);
      if (!mems) return;
      const userIds = (mems as any[]).map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
      setMembers((mems as any[]).map((m: any) => ({
        ...m,
        username: profiles?.find(p => p.user_id === m.user_id)?.username || 'User',
        avatar_url: profiles?.find(p => p.user_id === m.user_id)?.avatar_url,
      })));
    };

    const loadMessages = async () => {
      const { data } = await supabase
        .from('group_messages' as any)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!data) return;
      const senderIds = [...new Set((data as any[]).map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', senderIds);
      setMessages((data as any[]).map((m: any) => ({
        ...m,
        sender_name: profiles?.find(p => p.user_id === m.sender_id)?.username || 'User',
        sender_avatar: profiles?.find(p => p.user_id === m.sender_id)?.avatar_url,
      })));
    };

    loadMembers();
    loadMessages();
  }, [groupId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', newMsg.sender_id).single();
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, { ...newMsg, sender_name: profile?.username || 'User', sender_avatar: profile?.avatar_url }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    await supabase.from('group_messages' as any).insert({
      group_id: groupId,
      sender_id: user.id,
      content: newMessage.trim(),
    } as any);
    setNewMessage('');
    setSending(false);
  };

  const handleRemoveMember = async (userId: string) => {
    await supabase.from('group_members' as any).delete().eq('group_id', groupId).eq('user_id', userId);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    toast.info('Member removed');
  };

  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';
  let lastDate = '';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{groupName}</p>
          <p className="text-[10px] text-muted-foreground">{members.length} members</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Users className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-sm">Members</SheetTitle>
            </SheetHeader>
            <div className="p-3 space-y-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-xl">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{m.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.username}</p>
                    {m.role === 'admin' && <span className="text-[10px] text-primary">Admin</span>}
                  </div>
                  {isAdmin && m.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMember(m.user_id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          const dateStr = isToday(new Date(msg.created_at)) ? 'Today' : isYesterday(new Date(msg.created_at)) ? 'Yesterday' : format(new Date(msg.created_at), 'MMM d');
          const showDate = dateStr !== lastDate;
          if (showDate) lastDate = dateStr;
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{dateStr}</span>
                </div>
              )}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                {!isMine && (
                  <Avatar className="h-6 w-6 mr-1.5 mt-auto flex-shrink-0">
                    <AvatarImage src={msg.sender_avatar || undefined} />
                    <AvatarFallback className="text-[8px]">{msg.sender_name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-[70%]">
                  {!isMine && <p className="text-[10px] text-muted-foreground ml-1 mb-0.5">{msg.sender_name}</p>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm'}`}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className={`text-[9px] text-muted-foreground mt-0.5 ${isMine ? 'text-right' : ''}`}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2">
        <Input value={newMessage} onChange={e => setNewMessage(e.target.value.slice(0, 2000))} placeholder="Message..."
          className="flex-1 h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} maxLength={2000} />
        <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={!newMessage.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
