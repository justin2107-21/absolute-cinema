import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Globe, Palette, User, Shield, Bell, Accessibility, Info,
  ChevronRight, Check, X
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSettings, Language } from '@/contexts/SettingsContext';
import { useMood, MoodType, moodThemes } from '@/contexts/MoodContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type SettingsSection = 'main' | 'language' | 'theme' | 'account' | 'privacy' | 'notifications' | 'accessibility' | 'about' | 'terms' | 'privacypolicy' | 'contact' | 'guidelines';

export default function Settings() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useSettings();
  const { currentMood, setMood, theme } = useMood();
  const { isAuthenticated, user, logout } = useAuth();
  const { settings: privacySettings, update: updatePrivacy } = usePrivacySettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');

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
    const infoPage = INFO_PAGES[activeSection];
    if (infoPage) return infoPage.title;
    return settingsItems.find(i => i.id === activeSection)?.label || '';
  };

  const handleBack = () => {
    if (['terms', 'privacypolicy', 'contact', 'guidelines'].includes(activeSection)) {
      setActiveSection('about');
    } else if (activeSection === 'main') {
      navigate('/profile');
    } else {
      setActiveSection('main');
    }
  };

  const renderSection = () => {
    // Check if it's an info page
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
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  <p className="font-semibold">{user?.email}</p>
                  {user?.username && <p className="text-sm text-primary">@{user.username}</p>}
                </div>
                <div className="space-y-2">
                  <button className="w-full p-4 glass-card flex items-center justify-between">
                    <span>Edit Profile</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button className="w-full p-4 glass-card flex items-center justify-between">
                    <span>Change Password</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button className="w-full p-4 glass-card flex items-center justify-between">
                    <span>Connected Accounts</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                <Button variant="destructive" className="w-full" onClick={logout}>{t('auth.signOut')}</Button>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">Sign in to manage your account</p>
                <Button onClick={() => navigate('/auth')}>{t('auth.signIn')}</Button>
              </div>
            )}
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.privacy')}</h3>
            
            {/* Profile Visibility */}
            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">Profile Visibility</p>
              <p className="text-xs text-muted-foreground">Who can see your profile</p>
              <Select value={privacySettings.profile_visibility} onValueChange={(v) => updatePrivacy({ profile_visibility: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (anyone)</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activity Visibility */}
            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">Activity Visibility</p>
              <p className="text-xs text-muted-foreground">Control who can see your recent activity, ratings, and watched content</p>
              <Select value={privacySettings.activity_visibility} onValueChange={(v) => updatePrivacy({ activity_visibility: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friends">Allow friends to see activity</SelectItem>
                  <SelectItem value="hidden">Hide activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chat Permissions */}
            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">Chat Permissions</p>
              <p className="text-xs text-muted-foreground">Who can send you messages</p>
              <Select value={privacySettings.chat_permissions} onValueChange={(v) => updatePrivacy({ chat_permissions: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Friend Request Permissions */}
            <div className="glass-card p-4 space-y-2">
              <p className="font-medium">Friend Requests</p>
              <p className="text-xs text-muted-foreground">Who can send you friend requests</p>
              <Select value={privacySettings.friend_request_permissions} onValueChange={(v) => updatePrivacy({ friend_request_permissions: v as any })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="friends">Friends of Friends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <button className="w-full p-4 glass-card flex items-center justify-between">
                <div><p className="font-medium">Download My Data</p><p className="text-xs text-muted-foreground">Export your information</p></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="w-full p-4 glass-card flex items-center justify-between text-destructive">
                <div><p className="font-medium">Delete Account</p><p className="text-xs opacity-70">Permanently remove your data</p></div>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">{t('settings.notifications')}</h3>
            <div className="space-y-2">
              {[
                { label: 'Friend Activity', desc: 'When friends watch movies' },
                { label: 'Friend Requests', desc: 'When someone sends a request' },
                { label: 'New Releases', desc: 'Movies matching your taste' },
                { label: 'AI Recommendations', desc: 'Personalized suggestions' },
              ].map((item) => (
                <div key={item.label} className="p-4 glass-card flex items-center justify-between">
                  <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
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
              {[
                { label: 'Reduce Motion', desc: 'Minimize animations' },
                { label: 'High Contrast', desc: 'Improve readability' },
                { label: 'Large Text', desc: 'Increase font sizes' },
              ].map((item) => (
                <div key={item.label} className="p-4 glass-card flex items-center justify-between">
                  <div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <input type="checkbox" className="h-5 w-5 accent-primary" />
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
