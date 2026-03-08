import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, UserPlus, UserCheck, UserX, Activity, Star, Bookmark, Eye, MessageCircle, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { GroupChatWindow } from '@/components/chat/GroupChatWindow';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends, type FriendProfile } from '@/hooks/useFriends';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'activity' | 'friends' | 'requests';

function FriendsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Friends() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { friends, pendingRequests, activities, isLoading, sendFriendRequest, acceptRequest, declineRequest, searchUsers, refreshFriends } = useFriends();
  const { getOrCreateConversation } = useChat();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const [activeChat, setActiveChat] = useState<{ id: string; user: { user_id: string; username: string | null; avatar_url: string | null } } | null>(() => {
    const chatId = searchParams.get('chat');
    const userId = searchParams.get('user');
    if (chatId && userId) return { id: chatId, user: { user_id: userId, username: null, avatar_url: null } };
    return null;
  });
  const [activeGroup, setActiveGroup] = useState<{ id: string; name: string } | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  // Load nicknames for all friends + realtime subscription
  const loadNicknames = async () => {
    if (!user || friends.length === 0) return;
    const { data: convos } = await supabase
      .from('dm_conversations')
      .select('id, participant1_id, participant2_id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);
    if (!convos || convos.length === 0) return;

    const convoIds = convos.map(c => c.id);
    const { data: nns } = await supabase
      .from('chat_nicknames')
      .select('conversation_id, user_id, nickname')
      .in('conversation_id', convoIds);
    if (!nns) return;

    const map: Record<string, string> = {};
    for (const nn of nns) {
      const convo = convos.find(c => c.id === nn.conversation_id);
      if (!convo) continue;
      const friendId = convo.participant1_id === user.id ? convo.participant2_id : convo.participant1_id;
      if (nn.user_id === friendId) {
        map[friendId] = nn.nickname;
      }
    }
    setNicknames(map);
  };

  useEffect(() => {
    loadNicknames();
  }, [user, friends]);

  // Realtime: listen for nickname changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('nicknames-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_nicknames',
      }, () => {
        loadNicknames();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, friends]);

  // Realtime: listen for friend request changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('friends-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
      }, () => {
        refreshFriends();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Realtime: listen for profile updates (avatar, username changes)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, () => {
        refreshFriends();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getFriendDisplayName = (friend: FriendProfile) => {
    return nicknames[friend.user_id] || friend.username || 'User';
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const results = await searchUsers(q);
    setSearchResults(results);
    setIsSearching(false);
  };

  const openChat = async (friend: FriendProfile) => {
    const convoId = await getOrCreateConversation(friend.user_id);
    if (convoId) {
      setActiveChat({ id: convoId, user: { user_id: friend.user_id, username: friend.username, avatar_url: friend.avatar_url } });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'watchlist_add': return <Bookmark className="h-4 w-4 text-primary" />;
      case 'watched': return <Eye className="h-4 w-4 text-green-400" />;
      case 'rated': return <Star className="h-4 w-4 fill-accent text-accent" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (type: string, title: string, rating?: number | null) => {
    switch (type) {
      case 'watchlist_add': return <>added <span className="font-medium text-foreground">{title}</span> to Watchlist</>;
      case 'watched': return <>watched <span className="font-medium text-foreground">{title}</span></>;
      case 'rated': return <>rated <span className="font-medium text-foreground">{title}</span> {'⭐'.repeat(rating || 0)}</>;
      default: return <>{title}</>;
    }
  };

  const getContentPath = (activity: typeof activities[0]) => {
    if (activity.content_source === 'anilist') return `/anime/${activity.content_id}`;
    if (activity.media_type === 'tv') return `/tv/${activity.content_id}`;
    return `/movie/${activity.content_id}`;
  };

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="space-y-6 pt-4">
          <header className="px-4">
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
              Friends
            </motion.h1>
          </header>
          <section className="px-4">
            <div className="glass-card p-8 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Sign in to connect</h3>
              <p className="text-sm text-muted-foreground">Sign in to add friends, see what they're watching, and share your movie journey.</p>
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </div>
          </section>
        </div>
      </AppLayout>
    );
  }

  // Active group chat - renders full screen
  if (activeGroup) {
    return <GroupChatWindow groupId={activeGroup.id} groupName={activeGroup.name} onBack={() => setActiveGroup(null)} />;
  }

  // Active DM chat - renders full screen
  if (activeChat) {
    return <ChatWindow conversationId={activeChat.id} otherUser={activeChat.user} onBack={() => setActiveChat(null)} />;
  }

  return (
    <AppLayout>
      <div className="space-y-4 pt-4">
        <header className="px-4 flex items-center justify-between">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
            Friends
          </motion.h1>
          <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(true)}>
            <Plus className="h-4 w-4 mr-1" /> Group
          </Button>
        </header>

        <div className="px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'friends' as Tab, label: 'Friends', count: friends.length },
            { id: 'activity' as Tab, label: 'Activity', count: 0 },
            { id: 'requests' as Tab, label: 'Requests', count: pendingRequests.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
              {tab.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-background/20">{tab.count}</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 space-y-4 pb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input type="text" placeholder="Search users by username..." value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)} className="pl-12" />
              </div>

              {searchQuery.trim().length >= 2 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Search Results</p>
                  {isSearching ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">No users found</div>
                  ) : (
                    searchResults.map(profile => (
                      <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{profile.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 font-medium text-sm">{profile.username || 'User'}</span>
                        <Button size="sm" variant="outline" onClick={() => sendFriendRequest(profile.user_id)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {isLoading && !searchQuery ? (
                <FriendsListSkeleton />
              ) : friends.length === 0 && !searchQuery ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="font-medium">No friends yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Search for users above to send friend requests</p>
                </div>
              ) : (
                !searchQuery && friends.map(friend => {
                  const displayName = getFriendDisplayName(friend);
                  return (
                    <button key={friend.id} onClick={() => openChat(friend)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        {nicknames[friend.user_id] && (
                          <p className="text-[10px] text-muted-foreground truncate">{friend.username || 'User'}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Tap to chat</p>
                      </div>
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 space-y-3 pb-8">
              {isLoading ? (
                <FriendsListSkeleton />
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="font-medium">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Activity from you and your friends will appear here</p>
                </div>
              ) : (
                activities.map((activity, i) => (
                  <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-3 p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => activity.content_id && navigate(getContentPath(activity))}>
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={activity.avatar_url || undefined} />
                      <AvatarFallback>{activity.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{activity.user_id === user?.id ? 'You' : activity.username}</span>{' '}
                        {getActivityText(activity.activity_type, activity.content_title, activity.rating)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {activity.content_poster && (
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img src={activity.content_poster} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 space-y-3 pb-8">
              {isLoading ? (
                <FriendsListSkeleton />
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="font-medium">No pending requests</p>
                  <p className="text-sm text-muted-foreground mt-1">Friend requests you receive will appear here</p>
                </div>
              ) : (
                pendingRequests.map(request => (
                  <div key={request.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.sender_profile?.avatar_url || undefined} />
                      <AvatarFallback>{request.sender_profile?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{request.sender_profile?.username || 'User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequest(request.id)}><UserCheck className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => declineRequest(request.id)}><UserX className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        friends={friends}
        onGroupCreated={(id, name) => {
          setShowCreateGroup(false);
          setActiveGroup({ id, name });
        }}
      />
    </AppLayout>
  );
}
