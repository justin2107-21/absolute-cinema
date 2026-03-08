import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserMinus, ShieldAlert, Flag, MessageCircle, Bookmark, Check, Users, Activity, Star, Eye } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { parseAnimatedBanner, isVideoBanner, getVideoBannerUrl } from '@/components/profile/BannerSelector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface UserProfile {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  banner_url: string | null;
}

interface UserActivity {
  id: string;
  activity_type: string;
  content_title: string;
  content_poster: string | null;
  rating: number | null;
  created_at: string;
}

export default function FriendProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { friends, removeFriend } = useFriends();
  const { getOrCreateConversation } = useChat();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    const load = async () => {
      setIsLoading(true);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      setProfile(profileData ? { ...profileData as any, banner_url: (profileData as any)?.banner_url || null } as UserProfile : null);

      // Check friend status
      const friendMatch = friends.some(f => f.user_id === userId);
      setIsFriend(friendMatch);

      // Load activities (only if friends - RLS handles this)
      if (friendMatch) {
        const { data: acts } = await supabase
          .from('user_activities')
          .select('id, activity_type, content_title, content_poster, rating, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        setActivities((acts || []) as UserActivity[]);
      }

      setIsLoading(false);
    };
    load();
  }, [userId, isAuthenticated, friends]);

  const handleUnfriend = async () => {
    if (!userId) return;
    await removeFriend(userId);
    setIsFriend(false);
    toast.success('Friend removed');
  };

  const handleBlock = async () => {
    if (!user || !userId) return;
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id: userId });
    if (error) { toast.error('Failed to block user'); return; }
    await removeFriend(userId);
    toast.success('User blocked');
    navigate('/friends');
  };

  const handleReport = async () => {
    if (!user || !userId || !reportReason) return;
    const { error } = await supabase
      .from('user_reports')
      .insert({ reporter_id: user.id, reported_id: userId, reason: reportReason, details: reportDetails || null });
    if (error) { toast.error('Failed to submit report'); return; }
    toast.success('Report submitted. Thank you.');
    setReportReason('');
    setReportDetails('');
  };

  const handleChat = async () => {
    if (!userId) return;
    const convoId = await getOrCreateConversation(userId);
    if (convoId) {
      navigate(`/friends?chat=${convoId}&user=${userId}`);
    }
  };

  const getActivityText = (type: string, title: string, rating?: number | null) => {
    switch (type) {
      case 'watchlist_add': return `Added ${title} to Watchlist`;
      case 'watched': return `Watched ${title}`;
      case 'rated': return `Rated ${title} ${'⭐'.repeat(rating || 0)}`;
      default: return title;
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

  if (isLoading) {
    return (
      <AppLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout hideNav>
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <div className="pb-8">
        {/* Banner */}
        {(() => {
          const animated = profile.banner_url ? parseAnimatedBanner(profile.banner_url) : null;
          const isGradient = profile.banner_url?.startsWith('linear-gradient');
          const isCustomImage = profile.banner_url && !animated && !isGradient;
          const style: React.CSSProperties = isGradient
            ? { background: profile.banner_url! }
            : isCustomImage
              ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {};
          return (
            <div className="relative h-32 bg-gradient-to-br from-primary/30 to-accent/20 overflow-hidden" style={!animated ? style : {}}>
              {animated && (
                <img src={animated.image} alt="Banner" className={`absolute inset-0 w-full h-full object-cover banner-anim-${animated.animation}`} />
              )}
              <div className="absolute top-4 left-4 z-20">
                <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Banner animation keyframes */}
        <style>{`
          @keyframes bannerSlowZoom {
            0% { transform: scale(1); }
            50% { transform: scale(1.15); }
            100% { transform: scale(1); }
          }
          @keyframes bannerSlowPan {
            0% { transform: scale(1.2) translateX(-5%); }
            50% { transform: scale(1.2) translateX(5%); }
            100% { transform: scale(1.2) translateX(-5%); }
          }
          @keyframes bannerSlowPulse {
            0% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.08); filter: brightness(1.15); }
            100% { transform: scale(1); filter: brightness(1); }
          }
          .banner-anim-slowZoom { animation: bannerSlowZoom 12s ease-in-out infinite; }
          .banner-anim-slowPan { animation: bannerSlowPan 14s ease-in-out infinite; }
          .banner-anim-slowPulse { animation: bannerSlowPulse 10s ease-in-out infinite; }
        `}</style>

        {/* Profile Info */}
        <div className="px-4 -mt-12 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/20">
                  {profile.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <h1 className="text-xl font-bold">{profile.username || 'User'}</h1>
                {profile.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
              </div>
            </div>

            {/* Actions */}
            {isFriend && (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={handleChat}>
                  <MessageCircle className="h-4 w-4" /> Message
                </Button>
              </div>
            )}

            {/* Management */}
            <div className="flex gap-2 flex-wrap">
              {isFriend && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <UserMinus className="h-3.5 w-3.5" /> Unfriend
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {profile.username} from your friends list. You can add them back later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnfriend}>Unfriend</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> Block
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Block User</AlertDialogTitle>
                    <AlertDialogDescription>
                      Blocking {profile.username} will prevent them from messaging you, viewing your profile, and sending friend requests. This action can be undone in settings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Block</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Flag className="h-3.5 w-3.5" /> Report
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Report User</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please select a reason for reporting {profile.username}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {['Harassment', 'Spam', 'Inappropriate Content', 'Other'].map(r => (
                        <button
                          key={r}
                          onClick={() => setReportReason(r)}
                          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                            reportReason === r ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Additional details (optional)"
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReport} disabled={!reportReason}>Submit Report</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        {isFriend && (
          <section className="px-4 mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent Activity
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activities.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    {getActivityIcon(a.activity_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{getActivityText(a.activity_type, a.content_title, a.rating)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {a.content_poster && (
                      <div className="w-8 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={a.content_poster} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
