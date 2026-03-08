import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Globe, Palette, User, Shield, Bell, Accessibility, Info,
  ChevronRight, Check, Eye, EyeOff, Download, Trash2, Loader2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { useSettings, Language } from '@/contexts/SettingsContext';
import { useMood, MoodType, moodThemes } from '@/contexts/MoodContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const moodOptions: { id: MoodType; label: string; emoji: string }[] = [
  { id: 'default', label: 'Default Purple', emoji: '💜' },
  { id: 'happy', label: 'Happy Yellow', emoji: '😊' },
  { id: 'sad', label: 'Melancholy Blue', emoji: '😢' },
  { id: 'stressed', label: 'Calm Teal', emoji: '😰' },
  { id: 'romantic', label: 'Romantic Pink', emoji: '💕' },
  { id: 'excited', label: 'Energetic Orange', emoji: '🎉' },
  { id: 'relaxed', label: 'Peaceful Cyan', emoji: '😌' },
  { id: 'lonely', label: 'Comfort Indigo', emoji: '🥺' },
  { id: 'nostalgic', label: 'Warm Amber', emoji: '🌅' },
  { id: 'motivated', label: 'Vibrant Green', emoji: '💪' },
  { id: 'curious', label: 'Mysterious Violet', emoji: '🤔' },
  { id: 'hopeful', label: 'Fresh Mint', emoji: '✨' },
];

const INFO_PAGES: Record<string, { title: string; content: React.ReactNode }> = {
  terms: {
    title: 'Terms of Service',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Last updated: March 2026</p>
        <p>Welcome to Absolute Cinema. By using our application, you agree to the following terms:</p>
        <h4 className="font-semibold text-foreground">1. Acceptance of Terms</h4>
        <p>By accessing or using Absolute Cinema, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        <h4 className="font-semibold text-foreground">2. User Accounts</h4>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities under your account.</p>
        <h4 className="font-semibold text-foreground">3. User Content</h4>
        <p>You retain ownership of content you post (comments, reviews). By posting, you grant us a non-exclusive license to display your content within the platform.</p>
        <h4 className="font-semibold text-foreground">4. Prohibited Conduct</h4>
        <p>Users may not: post illegal content, harass others, spam, distribute malware, attempt unauthorized access, or violate intellectual property rights.</p>
        <h4 className="font-semibold text-foreground">5. Third-Party Services</h4>
        <p>We use TMDB and AniList APIs for media data. We are not responsible for third-party service availability or accuracy.</p>
        <h4 className="font-semibold text-foreground">6. Limitation of Liability</h4>
        <p>Absolute Cinema is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages.</p>
        <h4 className="font-semibold text-foreground">7. Changes to Terms</h4>
        <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.</p>
      </div>
    ),
  },
  privacypolicy: {
    title: 'Privacy Policy',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Last updated: March 2026</p>
        <h4 className="font-semibold text-foreground">Information We Collect</h4>
        <p>We collect information you provide directly: email address, username, and profile data. We also collect usage data including watchlist activity and browsing preferences.</p>
        <h4 className="font-semibold text-foreground">How We Use Information</h4>
        <p>Your data is used to: provide and improve the service, personalize recommendations, enable social features, and communicate with you about your account.</p>
        <h4 className="font-semibold text-foreground">Data Storage</h4>
        <p>Your data is stored securely using industry-standard encryption. Watchlist data is stored locally on your device and in our cloud database when you're signed in.</p>
        <h4 className="font-semibold text-foreground">Data Sharing</h4>
        <p>We do not sell your personal data. We may share anonymized usage statistics. Your profile information may be visible to other users for social features.</p>
        <h4 className="font-semibold text-foreground">Your Rights</h4>
        <p>You can access, update, or delete your personal data at any time through the Settings page. You can request a full data export or account deletion.</p>
        <h4 className="font-semibold text-foreground">Cookies & Local Storage</h4>
        <p>We use local storage for preferences and session management. No third-party tracking cookies are used.</p>
      </div>
    ),
  },
  contact: {
    title: 'Contact Support',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">We're here to help!</p>
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-semibold text-foreground">Email Support</h4>
          <p>For general inquiries, bug reports, or feature requests:</p>
          <p className="text-primary font-medium">support@absolutecinema.app</p>
        </div>
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-semibold text-foreground">Report a Bug</h4>
          <p>Found something broken? Please include:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Description of the issue</li>
            <li>Steps to reproduce</li>
            <li>Device and browser information</li>
            <li>Screenshots if possible</li>
          </ul>
        </div>
        <div className="glass-card p-4 space-y-3">
          <h4 className="font-semibold text-foreground">Response Time</h4>
          <p>We typically respond within 24-48 hours during business days.</p>
        </div>
      </div>
    ),
  },
  guidelines: {
    title: 'Community Guidelines',
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Be respectful and constructive</p>
        <ul className="list-disc pl-4 space-y-2">
          <li>Treat others with respect. No hate speech, harassment, or personal attacks.</li>
          <li>Keep discussions relevant to the content being discussed.</li>
          <li>No spoilers without proper warnings — use spoiler tags when discussing plot points.</li>
          <li>Do not post spam, advertisements, or self-promotion.</li>
          <li>Avoid excessive use of caps, emojis, or repetitive messages.</li>
          <li>Do not share illegal streaming links or pirated content.</li>
          <li>Report inappropriate content instead of engaging with it.</li>
          <li>Keep language appropriate — this is a community for all ages.</li>
        </ul>
        <p className="text-xs">Violations may result in comment removal or account suspension.</p>
      </div>
    ),
  },
};

type SettingsSection = 'main' | 'language' | 'theme' | 'account' | 'editProfile' | 'changePassword' | 'connectedAccounts' | 'privacy' | 'notifications' | 'accessibility' | 'about' | 'terms' | 'privacypolicy' | 'contact' | 'guidelines';

export default function Settings() {
  const navigate = useNavigate();
  const { language, setLanguage, t, notifications, setNotifications, accessibility, setAccessibility } = useSettings();
  const { currentMood, setMood } = useMood();
  const { isAuthenticated, user, logout, refreshAvatar } = useAuth();
  const { settings: privacySettings, update: updatePrivacy } = usePrivacySettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');

  // Edit Profile state
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Download data state
  const [downloading, setDownloading] = useState(false);

  // Load profile data when entering edit profile
  useEffect(() => {
    if (activeSection === 'editProfile' && user) {
      (async () => {
        const { data } = await supabase.from('profiles').select('username, bio').eq('user_id', user.id).single();
        if (data) {
          setEditUsername(data.username || '');
          setEditBio(data.bio || '');
        }
      })();
    }
  }, [activeSection, user]);

  const settingsItems = [
    { id: 'language' as const, icon: Globe, label: t('settings.language'), desc: t('settings.languageDesc') },
    { id: 'theme' as const, icon: Palette, label: t('settings.theme'), desc: t('settings.themeDesc') },
    { id: 'account' as const, icon: User, label: t('settings.account'), desc: t('settings.accountDesc') },
    { id: 'privacy' as const, icon: Shield, label: t('settings.privacy'), desc: t('settings.privacyDesc') },
    { id: 'notifications' as const, icon: Bell, label: t('settings.notifications'), desc: t('settings.notificationsDesc') },
    { id: 'accessibility' as const, icon: Accessibility, label: t('settings.accessibility'), desc: t('settings.accessibilityDesc') },
    { id: 'about' as const, icon: Info, label: t('settings.about'), desc: t('settings.aboutDesc') },
  ];

  const getSectionTitle = () => {
    if (activeSection === 'main') return t('settings.title');
    if (activeSection === 'editProfile') return t('account.editProfile');
    if (activeSection === 'changePassword') return t('account.changePassword');
    if (activeSection === 'connectedAccounts') return t('account.connectedAccounts');
    const infoPage = INFO_PAGES[activeSection];
    if (infoPage) return infoPage.title;
    return settingsItems.find(i => i.id === activeSection)?.label || '';
  };

  const handleBack = () => {
    if (['terms', 'privacypolicy', 'contact', 'guidelines'].includes(activeSection)) {
      setActiveSection('about');
    } else if (['editProfile', 'changePassword', 'connectedAccounts'].includes(activeSection)) {
      setActiveSection('account');
    } else if (activeSection === 'main') {
      navigate('/profile');
    } else {
      setActiveSection('main');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editUsername.trim()) {
      toast.error('Username cannot be empty');
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      username: editUsername.trim(),
      bio: editBio.trim(),
    }).eq('user_id', user.id);
    setSavingProfile(false);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setActiveSection('account');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSection('account');
    }
  };

  const handleConnectGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error('Failed to connect Google');
  };

  const handleConnectApple = async () => {
    const { error } = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error('Failed to connect Apple');
  };

  const handleDownloadData = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const [profileRes, watchlistRes, activitiesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id),
        supabase.from('watchlist').select('*').eq('user_id', user.id),
        supabase.from('user_activities').select('*').eq('user_id', user.id),
        supabase.from('comments').select('*').eq('user_id', user.id),
      ]);
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data || [],
        watchlist: watchlistRes.data || [],
        activities: activitiesRes.data || [],
        comments: commentsRes.data || [],
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `absolutecinema-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch {
      toast.error('Failed to export data');
    }
    setDownloading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    if (!user) return;
    // Delete user data from tables
    await Promise.all([
      supabase.from('watchlist').delete().eq('user_id', user.id),
      supabase.from('user_activities').delete().eq('user_id', user.id),
      supabase.from('comments').delete().eq('user_id', user.id),
      supabase.from('profiles').delete().eq('user_id', user.id),
      supabase.from('friend_requests').delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);
    await logout();
    toast.success('Account data deleted. You have been signed out.');
    navigate('/');
  };

  const renderSection = () => {
    const infoPage = INFO_PAGES[activeSection];
    if (infoPage) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{infoPage.title}</h3>
          {infoPage.content}
        </div>
      );
    }

    switch (activeSection) {
      case 'language':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.language')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
            <div className="space-y-2 mt-4">
              {[
                { code: 'en' as Language, label: 'English', native: 'English' },
                { code: 'tl' as Language, label: 'Tagalog', native: 'Tagalog' },
              ].map((lang) => (
                <button key={lang.code} onClick={() => setLanguage(lang.code)}
                  className={cn("w-full p-4 rounded-xl flex items-center justify-between transition-all",
                    language === lang.code ? "bg-primary/20 border-2 border-primary" : "glass-card hover:bg-secondary/50")}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.code === 'en' ? '🇺🇸' : '🇵🇭'}</span>
                    <div className="text-left">
                      <p className="font-medium">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.native}</p>
                    </div>
                  </div>
                  {language === lang.code && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.theme')}</h3>
            <p className="text-sm text-muted-foreground">Choose a mood theme that changes the entire app's color scheme</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {moodOptions.map((mood) => {
                const moodTheme = moodThemes[mood.id];
                return (
                  <button key={mood.id} onClick={() => setMood(mood.id)}
                    className={cn("p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2",
                      currentMood === mood.id ? "border-primary bg-primary/10" : "border-transparent glass-card hover:bg-secondary/50")}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `hsl(${moodTheme.primary} / 0.3)` }}>{mood.emoji}</div>
                    <span className="text-xs font-medium text-center">{mood.label}</span>
                    {currentMood === mood.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.account')}</h3>
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground">{t('account.signedInAs')}</p>
                  <p className="font-semibold">{user?.email}</p>
                  {user?.username && <p className="text-sm text-primary">@{user.username}</p>}
                </div>
                <div className="space-y-2">
                  <button onClick={() => setActiveSection('editProfile')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <span>{t('account.editProfile')}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setActiveSection('changePassword')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <span>{t('account.changePassword')}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setActiveSection('connectedAccounts')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <span>{t('account.connectedAccounts')}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                <Button variant="destructive" className="w-full" onClick={logout}>{t('auth.signOut')}</Button>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">{t('account.signInToManage')}</p>
                <Button onClick={() => navigate('/auth')}>{t('auth.signIn')}</Button>
              </div>
            )}
          </div>
        );

      case 'editProfile':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('account.editProfile')}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('account.username')}</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Your username" maxLength={30} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('account.bio')}</label>
                <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell us about yourself..." maxLength={200} rows={4} className="resize-none" />
                <p className="text-xs text-muted-foreground text-right">{editBio.length}/200</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('account.saving')}</> : t('account.saveChanges')}
              </Button>
            </div>
          </div>
        );

      case 'changePassword':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('account.changePassword')}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('account.newPassword')}</label>
                <div className="relative">
                  <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('account.confirmPassword')}</label>
                <div className="relative">
                  <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              <Button onClick={handleChangePassword} disabled={updatingPassword || !newPassword || !confirmPassword} className="w-full">
                {updatingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('account.updating')}</> : t('account.updatePassword')}
              </Button>
            </div>
          </div>
        );

      case 'connectedAccounts':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('account.connectedAccounts')}</h3>
            <p className="text-sm text-muted-foreground">{t('account.oauthDesc')}</p>
            <div className="space-y-3">
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Google</p>
                    <p className="text-xs text-muted-foreground">Sign in with Google</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleConnectGoogle}>
                  {t('account.googleConnect')}
                </Button>
              </div>
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Apple</p>
                    <p className="text-xs text-muted-foreground">Sign in with Apple</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleConnectApple}>
                  {t('account.appleConnect')}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.privacy')}</h3>
            
            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">{t('privacy.profileVisibility')}</p>
              <p className="text-xs text-muted-foreground">{t('privacy.profileVisibilityDesc')}</p>
              <Select value={privacySettings.profile_visibility} onValueChange={(v) => updatePrivacy({ profile_visibility: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t('privacy.public')}</SelectItem>
                  <SelectItem value="friends">{t('privacy.friendsOnly')}</SelectItem>
                  <SelectItem value="private">{t('privacy.private')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">{t('privacy.activityVisibility')}</p>
              <p className="text-xs text-muted-foreground">{t('privacy.activityVisibilityDesc')}</p>
              <Select value={privacySettings.activity_visibility} onValueChange={(v) => updatePrivacy({ activity_visibility: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friends">{t('privacy.activityFriends')}</SelectItem>
                  <SelectItem value="hidden">{t('privacy.activityHidden')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">{t('privacy.chatPermissions')}</p>
              <p className="text-xs text-muted-foreground">{t('privacy.chatPermissionsDesc')}</p>
              <Select value={privacySettings.chat_permissions} onValueChange={(v) => updatePrivacy({ chat_permissions: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">{t('privacy.everyone')}</SelectItem>
                  <SelectItem value="friends">{t('privacy.friendsOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">{t('privacy.friendRequests')}</p>
              <p className="text-xs text-muted-foreground">{t('privacy.friendRequestsDesc')}</p>
              <Select value={privacySettings.friend_request_permissions} onValueChange={(v) => updatePrivacy({ friend_request_permissions: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">{t('privacy.everyone')}</SelectItem>
                  <SelectItem value="friends">{t('privacy.friendsOfFriends')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <button onClick={handleDownloadData} disabled={downloading} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <div><p className="font-medium">{t('privacy.downloadData')}</p><p className="text-xs text-muted-foreground">{t('privacy.downloadDataDesc')}</p></div>
                {downloading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Download className="h-5 w-5 text-muted-foreground" />}
              </button>

              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full p-4 glass-card flex items-center justify-between text-destructive hover:bg-destructive/10 transition-colors">
                  <div><p className="font-medium">{t('privacy.deleteAccount')}</p><p className="text-xs opacity-70">{t('privacy.deleteAccountDesc')}</p></div>
                  <Trash2 className="h-5 w-5" />
                </button>
              ) : (
                <div className="glass-card p-4 space-y-3 border-2 border-destructive/50">
                  <p className="text-sm text-destructive font-medium">{t('privacy.deleteConfirm')}</p>
                  <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" className="border-destructive/50" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>{t('common.cancel')}</Button>
                    <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'}>
                      <Trash2 className="h-4 w-4 mr-2" />{t('privacy.deleteAccount')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.notifications')}</h3>
            <div className="space-y-2">
              {([
                { key: 'friendActivity' as const, label: t('notif.friendActivity'), desc: t('notif.friendActivityDesc') },
                { key: 'friendRequests' as const, label: t('notif.friendRequests'), desc: t('notif.friendRequestsDesc') },
                { key: 'newReleases' as const, label: t('notif.newReleases'), desc: t('notif.newReleasesDesc') },
                { key: 'aiRecommendations' as const, label: t('notif.aiRecommendations'), desc: t('notif.aiRecommendationsDesc') },
              ]).map((item) => (
                <div key={item.key} className="p-4 glass-card flex items-center justify-between">
                  <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'accessibility':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.accessibility')}</h3>
            <div className="space-y-2">
              {([
                { key: 'reduceMotion' as const, label: t('a11y.reduceMotion'), desc: t('a11y.reduceMotionDesc') },
                { key: 'highContrast' as const, label: t('a11y.highContrast'), desc: t('a11y.highContrastDesc') },
                { key: 'largeText' as const, label: t('a11y.largeText'), desc: t('a11y.largeTextDesc') },
              ]).map((item) => (
                <div key={item.key} className="p-4 glass-card flex items-center justify-between">
                  <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch
                    checked={accessibility[item.key]}
                    onCheckedChange={(checked) => setAccessibility({ ...accessibility, [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.about')}</h3>
            <div className="glass-card p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-2xl">🎬</span>
              </div>
              <div>
                <h4 className="font-display font-bold text-xl uppercase">Absolute Cinema</h4>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
              <p className="text-sm text-muted-foreground">Your AI-powered movie companion. Discover films that match your mood.</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => setActiveSection('terms')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <span>Terms of Service</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => setActiveSection('privacypolicy')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <span>Privacy Policy</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => setActiveSection('guidelines')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <span>Community Guidelines</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => setActiveSection('contact')} className="w-full p-4 glass-card flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <span>Contact Support</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        <header className="px-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {getSectionTitle()}
          </motion.h1>
        </header>

        <AnimatePresence mode="wait">
          {activeSection === 'main' ? (
            <motion.section key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 space-y-2">
              {settingsItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }} onClick={() => setActiveSection(item.id)}
                    className="glass-card w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </motion.button>
                );
              })}
            </motion.section>
          ) : (
            <motion.section key={activeSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4 pb-8">
              {renderSection()}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
