import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, LogOut, Bookmark, Check, Users, ChevronRight, Film, Edit3, Camera, ImageIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SignInModal } from '@/components/auth/SignInModal';
import { ImageCropModal } from '@/components/profile/ImageCropModal';
import { BannerSelector } from '@/components/profile/BannerSelector';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function Profile() {
  const navigate = useNavigate();
  const { watchlist, watched } = useWatchlist();
  const { isAuthenticated, user, logout, avatarUrl, refreshAvatar } = useAuth();
  const { friends, activities, isLoading: friendsLoading } = useFriends();
  const [showSignInModal, setShowSignInModal] = useState(!isAuthenticated);
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ username: string; bio: string; avatar_url: string | null; banner_url: string | null }>({
    username: '', bio: '', avatar_url: null, banner_url: null,
  });
  const [editData, setEditData] = useState({ username: '', bio: '' });
  const [showBannerSelector, setShowBannerSelector] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }));
  }, [avatarUrl]);

  useEffect(() => {
    if (!user) { setProfileLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio, banner_url')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setProfileData({
          username: data.username || user.username,
          bio: data.bio || '',
          avatar_url: data.avatar_url,
          banner_url: (data as any).banner_url || null,
        });
        setEditData({
          username: data.username || user.username,
          bio: data.bio || '',
        });
      }
      setProfileLoading(false);
    };
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username: editData.username, bio: editData.bio })
      .eq('user_id', user.id);
    if (error) { toast.error('Failed to update profile'); return; }
    setProfileData(prev => ({ ...prev, username: editData.username, bio: editData.bio }));
    setIsEditing(false);
    toast.success('Profile updated!');
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG and JPG images are allowed'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB'); return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCroppedAvatar = async (dataUrl: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: dataUrl }).eq('user_id', user.id);
    if (error) { toast.error('Failed to upload avatar'); return; }
    setProfileData(prev => ({ ...prev, avatar_url: dataUrl }));
    await refreshAvatar();
    toast.success('Profile picture updated!');
  };

  const handleBannerSelect = async (value: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ banner_url: value } as any).eq('user_id', user.id);
    if (error) { toast.error('Failed to update banner'); return; }
    setProfileData(prev => ({ ...prev, banner_url: value }));
    toast.success('Banner updated!');
  };

  const myActivities = activities.filter(a => a.user_id === user?.id).slice(0, 5);

  const stats = [
    { label: 'Watchlist', value: watchlist.length, icon: Bookmark },
    { label: 'Watched', value: watched.length, icon: Check },
    { label: 'Friends', value: friends.length, icon: Users },
  ];

  const menuItems = [
    { label: 'My Watchlist', icon: Bookmark, onClick: () => navigate('/watchlist'), requiresAuth: true },
    { label: 'Watch History', icon: Film, onClick: () => navigate('/watchlist'), requiresAuth: true },
    { label: 'Friends', icon: Users, onClick: () => navigate('/friends'), requiresAuth: true },
    { label: 'Settings', icon: Settings, onClick: () => navigate('/settings'), requiresAuth: false },
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.requiresAuth && !isAuthenticated) setShowSignInModal(true);
    else item.onClick();
  };

  const bannerStyle = profileData.banner_url
    ? profileData.banner_url.startsWith('linear-gradient')
      ? { background: profileData.banner_url }
      : { backgroundImage: `url(${profileData.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <AppLayout>
      <SignInModal isOpen={showSignInModal && !isAuthenticated} onClose={() => setShowSignInModal(false)} />

      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          onOpenChange={() => setCropSrc(null)}
          imageSrc={cropSrc}
          aspect={1}
          onCropComplete={handleCroppedAvatar}
        />
      )}

      <BannerSelector open={showBannerSelector} onOpenChange={setShowBannerSelector} onSelect={handleBannerSelect} />

      <div className="space-y-6 pt-4">
        <header className="px-4">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">Profile</motion.h1>
        </header>

        {/* Profile Card */}
        <section className="px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div
              className="h-24 bg-gradient-to-r from-primary/40 to-accent/30 relative cursor-pointer group"
              style={bannerStyle}
              onClick={() => isAuthenticated && setShowBannerSelector(true)}
            >
              {isAuthenticated && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div className="px-4 pb-4 -mt-10">
              <div className="flex items-end gap-3">
                <div className="relative">
                  {profileLoading ? (
                    <Skeleton className="h-20 w-20 rounded-full" />
                  ) : (
                    <Avatar className="h-20 w-20 border-4 border-card shadow-xl">
                      <AvatarImage src={profileData.avatar_url || undefined} />
                      <AvatarFallback className="text-xl bg-primary/20">
                        {(profileData.username || 'G').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {isAuthenticated && (
                    <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer border-2 border-card">
                      <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarSelect} />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  {profileLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-2">
                      <Input value={editData.username} onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Display name" className="h-8 text-sm" />
                      <Textarea value={editData.bio} onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..." className="min-h-[50px] text-sm" maxLength={200} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveProfile}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold truncate">{isAuthenticated ? profileData.username : 'Guest User'}</h2>
                        {isAuthenticated && (
                          <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {profileData.bio && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{profileData.bio}</p>}
                    </>
                  )}
                </div>
              </div>
              {!isAuthenticated && (
                <Button className="w-full mt-4" onClick={() => setShowSignInModal(true)}>Sign in for full features</Button>
              )}
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="px-4">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }} className="glass-card p-4 text-center">
                  <Icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                  {friendsLoading && stat.label === 'Friends' ? (
                    <Skeleton className="h-7 w-8 mx-auto" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        {isAuthenticated && (
          <section className="px-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
            {friendsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                    <Skeleton className="w-8 h-12 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {myActivities.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                    {a.content_poster && (
                      <div className="w-8 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={a.content_poster} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.content_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.activity_type === 'rated' ? `Rated ${'⭐'.repeat(a.rating || 0)}` : a.activity_type === 'watched' ? 'Watched' : 'Added to watchlist'}
                        {' · '}{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Menu Items */}
        <section className="px-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }} onClick={() => handleMenuClick(item)}
                className="glass-card w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            );
          })}
        </section>

        {isAuthenticated && (
          <section className="px-4 pb-8">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
