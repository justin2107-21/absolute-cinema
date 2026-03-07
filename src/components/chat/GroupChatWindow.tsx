import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Users, X, Paperclip, Image as ImageIcon, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { GifPicker } from './GifPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

const EMOJI_LIST = ['😀','😂','🥲','😍','🤔','👍','👎','❤️','🔥','💯','🎬','🍿','⭐','😎','🥺','😭','🤩','💀','👀','🙏'];

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
  file_url?: string | null;
  file_name?: string | null;
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
  const { uploadFile } = useChat();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, { username: string; avatar_url: string | null }>>({});

  useEffect(() => {
    const loadMembers = async () => {
      const { data: mems } = await supabase.from('group_members').select('user_id, role').eq('group_id', groupId);
      if (!mems) return;
      const userIds = mems.map((m) => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
      const cache: Record<string, { username: string; avatar_url: string | null }> = {};
      profiles?.forEach(p => { cache[p.user_id] = { username: p.username || 'User', avatar_url: p.avatar_url }; });
      setProfilesCache(prev => ({ ...prev, ...cache }));
      setMembers(mems.map(m => ({
        ...m,
        username: cache[m.user_id]?.username || 'User',
        avatar_url: cache[m.user_id]?.avatar_url,
      })));
    };

    const loadMessages = async () => {
      const { data } = await supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).limit(200);
      if (!data) return;
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', senderIds);
      const cache: Record<string, { username: string; avatar_url: string | null }> = {};
      profiles?.forEach(p => { cache[p.user_id] = { username: p.username || 'User', avatar_url: p.avatar_url }; });
      setProfilesCache(prev => ({ ...prev, ...cache }));
      setMessages(data.map(m => ({
        ...m,
        sender_name: cache[m.sender_id]?.username || 'User',
        sender_avatar: cache[m.sender_id]?.avatar_url,
      })));
    };

    loadMembers();
    loadMessages();
  }, [groupId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          let senderName = profilesCache[newMsg.sender_id]?.username;
          let senderAvatar = profilesCache[newMsg.sender_id]?.avatar_url;
          if (!senderName) {
            const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', newMsg.sender_id).single();
            senderName = profile?.username || 'User';
            senderAvatar = profile?.avatar_url || null;
          }
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender_name: senderName, sender_avatar: senderAvatar }];
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, profilesCache]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    const content = newMessage;
    setNewMessage('');
    setSending(true);
    await supabase.from('group_messages').insert({ group_id: groupId, sender_id: user.id, content: content.trim() });
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSending(true);
    const result = await uploadFile(file);
    if (result) {
      await supabase.from('group_messages').insert({
        group_id: groupId, sender_id: user.id,
        content: file.name, message_type: type, file_url: result.url, file_name: result.name,
      });
    }
    setSending(false);
    e.target.value = '';
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!user) return;
    await supabase.from('group_messages').insert({
      group_id: groupId, sender_id: user.id, content: gifUrl, message_type: 'gif', file_url: gifUrl, file_name: 'GIF',
    });
  };

  const handleRemoveMember = async (userId: string) => {
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    toast.info('Member removed');
  };

  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';
  let lastDate = '';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm safe-top">
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
          const showDateLabel = dateStr !== lastDate;
          if (showDateLabel) lastDate = dateStr;
          return (
            <div key={msg.id}>
              {showDateLabel && (
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
                    {(msg.message_type === 'image' || msg.message_type === 'gif') && msg.file_url ? (
                      <img src={msg.file_url} alt="" className="rounded-lg max-w-full max-h-48 object-cover" />
                    ) : msg.message_type === 'file' && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                        <span>{msg.file_name || 'File'}</span>
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
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

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-3 py-2 border-t border-border bg-background">
          <div className="flex flex-wrap gap-2">
            {EMOJI_LIST.map(e => (
              <button key={e} onClick={() => { setNewMessage(prev => prev + e); setShowEmoji(false); }}
                className="text-xl hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border flex items-center gap-1.5 safe-bottom relative">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileUpload(e, 'file')} />
        <GifPicker open={showGif} onClose={() => setShowGif(false)} onSelect={handleGifSelect} />

        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => imageInputRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}>
          <span className="text-sm">GIF</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}>
          <Smile className="h-4 w-4" />
        </Button>

        <Input value={newMessage} onChange={e => setNewMessage(e.target.value.slice(0, 2000))} placeholder="Message..."
          className="flex-1 h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} maxLength={2000} />
        <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={!newMessage.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
