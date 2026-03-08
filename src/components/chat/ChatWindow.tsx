import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon, Smile, Info, X, Check, CheckCheck, FileText, Link2, Edit3, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat, type DmMessage } from '@/hooks/useChat';
import { GifPicker } from './GifPicker';
import { ChatThemePicker, getChatTheme, type ChatTheme } from './ChatThemePicker';
import { format, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
  otherUser: { user_id: string; username: string | null; avatar_url: string | null };
  onBack: () => void;
}

const EMOJI_LIST = ['😀','😂','🥲','😍','🤔','👍','👎','❤️','🔥','💯','🎬','🍿','⭐','😎','🥺','😭','🤩','💀','👀','🙏'];

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

function extractLinks(msgs: DmMessage[]) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return msgs.flatMap(m => {
    const matches = m.content.match(urlRegex);
    return matches ? matches.map(url => ({ url, date: m.created_at })) : [];
  });
}

export function ChatWindow({ conversationId, otherUser, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loadMessages, sendMessage, markAsRead, uploadFile } = useChat();
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [chatTheme, setChatThemeState] = useState<ChatTheme>(() => getChatTheme(conversationId));
  const [showThemes, setShowThemes] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const displayName = nickname || otherUser.username || 'User';

  // Load messages & nickname
  useEffect(() => {
    const load = async () => {
      const msgs = await loadMessages(conversationId);
      setMessages(msgs);
      markAsRead(conversationId);
      const { data: nn } = await supabase
        .from('chat_nicknames')
        .select('nickname')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUser.user_id)
        .single();
      if (nn) setNickname(nn.nickname);
    };
    load();
  }, [conversationId, loadMessages, markAsRead, otherUser.user_id]);

  // Realtime subscription for new messages AND updates (read receipts)
  useEffect(() => {
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as DmMessage;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== user?.id) {
          markAsRead(conversationId);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as DmMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read, is_delivered: updated.is_delivered } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, markAsRead, user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const content = newMessage;
    setNewMessage('');
    setSending(true);
    // Optimistic: add message locally
    const optimistic: DmMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user!.id,
      content,
      is_read: false,
      is_delivered: false,
      message_type: 'text',
      file_url: null,
      file_name: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    await sendMessage(conversationId, content);
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    const result = await uploadFile(file);
    if (result) {
      await sendMessage(conversationId, file.name, type === 'image' ? 'image' : 'file', result.url, result.name);
    }
    setSending(false);
    e.target.value = '';
  };

  const handleGifSelect = async (gifUrl: string) => {
    await sendMessage(conversationId, gifUrl, 'gif', gifUrl, 'GIF');
  };

  const handleSaveNickname = async () => {
    if (!user || !nicknameInput.trim()) return;
    const { error } = await supabase
      .from('chat_nicknames')
      .upsert({
        conversation_id: conversationId,
        user_id: otherUser.user_id,
        nickname: nicknameInput.trim(),
        set_by: user.id,
      } as any, { onConflict: 'conversation_id,user_id' });
    if (!error) {
      setNickname(nicknameInput.trim());
      setEditingNickname(false);
      toast.success('Nickname updated');
    }
  };

  const mediaMessages = messages.filter(m => m.message_type === 'image' || m.message_type === 'gif');
  const fileMessages = messages.filter(m => m.message_type === 'file');
  const links = extractLinks(messages);

  let lastDate = '';

  // Determine seen status for last own message
  const lastOwnMsgIdx = [...messages].reverse().findIndex(m => m.sender_id === user?.id);
  const lastOwnMsg = lastOwnMsgIdx >= 0 ? messages[messages.length - 1 - lastOwnMsgIdx] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm safe-top">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button onClick={() => navigate(`/user/${otherUser.user_id}`)} className="flex items-center gap-2.5 flex-1 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground">Active now</p>
          </div>
        </button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <Info className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-sm">Chat Settings</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="flex flex-col items-center gap-2 py-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="font-semibold">{displayName}</p>
              </div>

              <div className="space-y-1">
                <button onClick={() => setShowThemes(!showThemes)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-sm">
                  <Palette className="h-4 w-4 text-muted-foreground" /> Themes
                </button>
                {showThemes && (
                  <div className="px-1 pb-2">
                    <ChatThemePicker
                      conversationId={conversationId}
                      currentThemeId={chatTheme.id}
                      onSelect={(theme) => setChatThemeState(theme)}
                    />
                  </div>
                )}
                <button onClick={() => navigate(`/user/${otherUser.user_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-sm">
                  <Info className="h-4 w-4 text-muted-foreground" /> View Profile
                </button>
                <button onClick={() => { setNicknameInput(nickname || ''); setEditingNickname(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-sm">
                  <Edit3 className="h-4 w-4 text-muted-foreground" /> Change Nickname
                </button>
              </div>

              {editingNickname && (
                <div className="flex gap-2">
                  <Input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} placeholder="Enter nickname" className="h-8 text-sm" />
                  <Button size="sm" onClick={handleSaveNickname}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNickname(false)}><X className="h-3 w-3" /></Button>
                </div>
              )}

              <Tabs defaultValue="media" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
                  <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
                </TabsList>
                <TabsContent value="media" className="mt-2">
                  {mediaMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No shared media</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {mediaMessages.map(m => (
                        <a key={m.id} href={m.file_url || '#'} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img src={m.file_url || ''} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="files" className="mt-2 space-y-2">
                  {fileMessages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No shared files</p>
                  ) : (
                    fileMessages.map(m => (
                      <a key={m.id} href={m.file_url || '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{m.file_name || 'File'}</span>
                      </a>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="links" className="mt-2 space-y-2">
                  {links.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No shared links</p>
                  ) : (
                    links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-sm">
                        <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-primary">{l.url}</span>
                      </a>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">Start the conversation! Say hello 👋</div>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id;
          const dateLabel = getDateLabel(msg.created_at);
          const showDate = dateLabel !== lastDate;
          if (showDate) lastDate = dateLabel;
          const time = format(new Date(msg.created_at), 'h:mm a');
          const isLastOwn = isMine && msg.id === lastOwnMsg?.id;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{dateLabel}</span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
              >
                {!isMine && (
                  <Avatar className="h-6 w-6 mr-1.5 mt-auto flex-shrink-0">
                    <AvatarImage src={otherUser.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? `${chatTheme.sentBubble} ${chatTheme.sentText} rounded-br-sm`
                      : `${chatTheme.receivedBubble} ${chatTheme.receivedText} rounded-bl-sm`
                  }`}>
                    {(msg.message_type === 'image' || msg.message_type === 'gif') && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.file_url} alt="" className="rounded-lg max-w-full max-h-48 object-cover" />
                      </a>
                    ) : msg.message_type === 'file' && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                        <FileText className="h-4 w-4" /> {msg.file_name || 'Download file'}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[9px] text-muted-foreground">{time}</span>
                    {isMine && (
                      msg.is_read ? (
                        isLastOwn ? (
                          <Avatar className="h-3.5 w-3.5">
                            <AvatarImage src={otherUser.avatar_url || undefined} />
                            <AvatarFallback className="text-[6px]">{displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <CheckCheck className="h-3 w-3 text-primary" />
                        )
                      ) : msg.is_delivered ? (
                        <CheckCheck className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="px-3 py-2 border-t border-border bg-background">
            <div className="flex flex-wrap gap-2">
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => { setNewMessage(prev => prev + e); setShowEmoji(false); }}
                  className="text-xl hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="p-3 border-t border-border bg-background/80 backdrop-blur-sm flex items-center gap-1.5 safe-bottom relative">
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

        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
          placeholder="Message..."
          className="flex-1 h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          maxLength={2000}
        />
        <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSend} disabled={!newMessage.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
