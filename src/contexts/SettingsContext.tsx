import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'tl';

export interface NotificationSettings {
  friendActivity: boolean;
  friendRequests: boolean;
  newReleases: boolean;
  aiRecommendations: boolean;
}

export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
}

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  notifications: NotificationSettings;
  setNotifications: (n: NotificationSettings) => void;
  accessibility: AccessibilitySettings;
  setAccessibility: (a: AccessibilitySettings) => void;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.moodmatch': 'MoodMatch',
    'nav.party': 'Party',
    'nav.profile': 'Profile',
    
    // Home
    'home.trending': 'Trending Now',
    'home.popular': 'Popular Movies',
    'home.topRated': 'Top Rated',
    'home.nowPlaying': 'In Theaters',
    'home.upcoming': 'Coming Soon',
    'home.movies': 'Movies',
    'home.tvSeries': 'TV Series',
    'home.categories': 'Categories',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.loginWithEmail': 'Sign in with email',
    'auth.signOut': 'Sign Out',
    
    // Profile
    'profile.title': 'Profile',
    'profile.watchlist': 'Watchlist',
    'profile.watched': 'Watched',
    'profile.friends': 'Friends',
    'profile.settings': 'Settings',
    'profile.guestUser': 'Guest User',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.theme': 'Theme & Mood',
    'settings.themeDesc': 'Customize app appearance',
    'settings.account': 'Account',
    'settings.accountDesc': 'Manage your account',
    'settings.privacy': 'Privacy & Security',
    'settings.privacyDesc': 'Control your data',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Manage alerts',
    'settings.accessibility': 'Accessibility',
    'settings.accessibilityDesc': 'Visual and audio options',
    'settings.watchParty': 'Watch Party',
    'settings.watchPartyDesc': 'Party preferences',
    'settings.about': 'About',
    'settings.aboutDesc': 'App info and support',

    // Account
    'account.signedInAs': 'Signed in as',
    'account.editProfile': 'Edit Profile',
    'account.changePassword': 'Change Password',
    'account.connectedAccounts': 'Connected Accounts',
    'account.signInToManage': 'Sign in to manage your account',
    'account.username': 'Username',
    'account.bio': 'Bio',
    'account.saveChanges': 'Save Changes',
    'account.saving': 'Saving...',
    'account.currentPassword': 'Current Password',
    'account.newPassword': 'New Password',
    'account.confirmPassword': 'Confirm New Password',
    'account.updatePassword': 'Update Password',
    'account.updating': 'Updating...',
    'account.googleConnected': 'Connected',
    'account.googleConnect': 'Connect',
    'account.appleConnected': 'Connected',
    'account.appleConnect': 'Connect',
    'account.oauthDesc': 'Link your social accounts for easier sign-in',

    // Privacy
    'privacy.profileVisibility': 'Profile Visibility',
    'privacy.profileVisibilityDesc': 'Who can see your profile',
    'privacy.public': 'Public (anyone)',
    'privacy.friendsOnly': 'Friends Only',
    'privacy.private': 'Private',
    'privacy.activityVisibility': 'Activity Visibility',
    'privacy.activityVisibilityDesc': 'Control who can see your recent activity, ratings, and watched content',
    'privacy.activityFriends': 'Allow friends to see activity',
    'privacy.activityHidden': 'Hide activity',
    'privacy.chatPermissions': 'Chat Permissions',
    'privacy.chatPermissionsDesc': 'Who can send you messages',
    'privacy.everyone': 'Everyone',
    'privacy.friendRequests': 'Friend Requests',
    'privacy.friendRequestsDesc': 'Who can send you friend requests',
    'privacy.friendsOfFriends': 'Friends of Friends',
    'privacy.downloadData': 'Download My Data',
    'privacy.downloadDataDesc': 'Export your information',
    'privacy.deleteAccount': 'Delete Account',
    'privacy.deleteAccountDesc': 'Permanently remove your data',
    'privacy.deleteConfirm': 'Are you sure? This action cannot be undone. Type DELETE to confirm.',

    // Notifications
    'notif.friendActivity': 'Friend Activity',
    'notif.friendActivityDesc': 'When friends watch movies',
    'notif.friendRequests': 'Friend Requests',
    'notif.friendRequestsDesc': 'When someone sends a request',
    'notif.newReleases': 'New Releases',
    'notif.newReleasesDesc': 'Movies matching your taste',
    'notif.aiRecommendations': 'AI Recommendations',
    'notif.aiRecommendationsDesc': 'Personalized suggestions',

    // Accessibility
    'a11y.reduceMotion': 'Reduce Motion',
    'a11y.reduceMotionDesc': 'Minimize animations',
    'a11y.highContrast': 'High Contrast',
    'a11y.highContrastDesc': 'Improve readability',
    'a11y.largeText': 'Large Text',
    'a11y.largeTextDesc': 'Increase font sizes',
    
    // MoodMatch
    'mood.title': 'MoodMatch AI',
    'mood.subtitle': 'Find movies that match your mood',
    'mood.placeholder': 'Tell me how you\'re feeling...',
    'mood.showRecommendations': 'Show Recommendations',
    
    // Watch Party
    'party.title': 'Watch Party',
    'party.create': 'Create Watch Party',
    'party.join': 'Join a Party',
    'party.enterCode': 'Enter room code...',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try Again',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.viewDetails': 'View Details',
    'common.addToList': 'Add to List',
  },
  tl: {
    // Navigation
    'nav.home': 'Bahay',
    'nav.search': 'Maghanap',
    'nav.moodmatch': 'MoodMatch',
    'nav.party': 'Parti',
    'nav.profile': 'Profile',
    
    // Home
    'home.trending': 'Trending Ngayon',
    'home.popular': 'Sikat na Pelikula',
    'home.topRated': 'Pinakamataas ang Rating',
    'home.nowPlaying': 'Sa Sinehan',
    'home.upcoming': 'Paparating',
    'home.movies': 'Mga Pelikula',
    'home.tvSeries': 'Mga TV Series',
    'home.categories': 'Mga Kategorya',
    
    // Auth
    'auth.signIn': 'Mag-login',
    'auth.signUp': 'Gumawa ng Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.loginWithEmail': 'Mag-login gamit ang email',
    'auth.signOut': 'Mag-logout',
    
    // Profile
    'profile.title': 'Profile',
    'profile.watchlist': 'Listahan',
    'profile.watched': 'Napanood',
    'profile.friends': 'Mga Kaibigan',
    'profile.settings': 'Mga Setting',
    'profile.guestUser': 'Bisita',
    
    // Settings
    'settings.title': 'Mga Setting',
    'settings.language': 'Wika',
    'settings.languageDesc': 'Piliin ang iyong wika',
    'settings.theme': 'Tema at Mood',
    'settings.themeDesc': 'I-customize ang hitsura',
    'settings.account': 'Account',
    'settings.accountDesc': 'Pamahalaan ang account',
    'settings.privacy': 'Privacy at Seguridad',
    'settings.privacyDesc': 'Kontrolin ang data',
    'settings.notifications': 'Mga Abiso',
    'settings.notificationsDesc': 'Pamahalaan ang mga alerto',
    'settings.accessibility': 'Accessibility',
    'settings.accessibilityDesc': 'Mga opsyon sa visual at audio',
    'settings.watchParty': 'Watch Party',
    'settings.watchPartyDesc': 'Mga kagustuhan sa parti',
    'settings.about': 'Tungkol sa',
    'settings.aboutDesc': 'Impormasyon at suporta',

    // Account
    'account.signedInAs': 'Naka-login bilang',
    'account.editProfile': 'I-edit ang Profile',
    'account.changePassword': 'Palitan ang Password',
    'account.connectedAccounts': 'Mga Konektadong Account',
    'account.signInToManage': 'Mag-login para pamahalaan ang account',
    'account.username': 'Username',
    'account.bio': 'Bio',
    'account.saveChanges': 'I-save ang Pagbabago',
    'account.saving': 'Sini-save...',
    'account.currentPassword': 'Kasalukuyang Password',
    'account.newPassword': 'Bagong Password',
    'account.confirmPassword': 'Kumpirmahin ang Bagong Password',
    'account.updatePassword': 'I-update ang Password',
    'account.updating': 'Ina-update...',
    'account.googleConnected': 'Konektado',
    'account.googleConnect': 'Ikonekta',
    'account.appleConnected': 'Konektado',
    'account.appleConnect': 'Ikonekta',
    'account.oauthDesc': 'I-link ang iyong social accounts para mas madaling mag-login',

    // Privacy
    'privacy.profileVisibility': 'Visibility ng Profile',
    'privacy.profileVisibilityDesc': 'Sino ang makakakita ng profile mo',
    'privacy.public': 'Publiko (lahat)',
    'privacy.friendsOnly': 'Mga Kaibigan Lang',
    'privacy.private': 'Pribado',
    'privacy.activityVisibility': 'Visibility ng Aktibidad',
    'privacy.activityVisibilityDesc': 'Kontrolin kung sino ang makakakita ng aktibidad, rating, at pinanood mo',
    'privacy.activityFriends': 'Payagan ang mga kaibigan na makita ang aktibidad',
    'privacy.activityHidden': 'Itago ang aktibidad',
    'privacy.chatPermissions': 'Pahintulot sa Chat',
    'privacy.chatPermissionsDesc': 'Sino ang puwedeng mag-message sa iyo',
    'privacy.everyone': 'Lahat',
    'privacy.friendRequests': 'Mga Friend Request',
    'privacy.friendRequestsDesc': 'Sino ang puwedeng mag-send ng friend request',
    'privacy.friendsOfFriends': 'Mga Kaibigan ng Kaibigan',
    'privacy.downloadData': 'I-download ang Data Ko',
    'privacy.downloadDataDesc': 'I-export ang iyong impormasyon',
    'privacy.deleteAccount': 'Burahin ang Account',
    'privacy.deleteAccountDesc': 'Permanenteng tanggalin ang data',
    'privacy.deleteConfirm': 'Sigurado ka ba? Hindi na ito maibabalik. I-type ang DELETE para kumpirmahin.',

    // Notifications
    'notif.friendActivity': 'Aktibidad ng Kaibigan',
    'notif.friendActivityDesc': 'Kapag nanood ang mga kaibigan ng pelikula',
    'notif.friendRequests': 'Mga Friend Request',
    'notif.friendRequestsDesc': 'Kapag may nag-send ng request',
    'notif.newReleases': 'Bagong Labas',
    'notif.newReleasesDesc': 'Mga pelikula ayon sa panlasa mo',
    'notif.aiRecommendations': 'AI Recommendations',
    'notif.aiRecommendationsDesc': 'Mga personalized na mungkahi',

    // Accessibility
    'a11y.reduceMotion': 'Bawasan ang Galaw',
    'a11y.reduceMotionDesc': 'I-minimize ang mga animation',
    'a11y.highContrast': 'Mataas na Contrast',
    'a11y.highContrastDesc': 'Pagandahin ang readability',
    'a11y.largeText': 'Malaking Text',
    'a11y.largeTextDesc': 'Palakihin ang font sizes',
    
    // MoodMatch
    'mood.title': 'MoodMatch AI',
    'mood.subtitle': 'Humanap ng pelikula ayon sa mood mo',
    'mood.placeholder': 'Sabihin mo kung ano ang nararamdaman mo...',
    'mood.showRecommendations': 'Ipakita ang mga Rekomendasyon',
    
    // Watch Party
    'party.title': 'Watch Party',
    'party.create': 'Gumawa ng Watch Party',
    'party.join': 'Sumali sa Parti',
    'party.enterCode': 'Ilagay ang room code...',
    
    // Common
    'common.loading': 'Naglo-load...',
    'common.error': 'May problema',
    'common.retry': 'Subukan Ulit',
    'common.save': 'I-save',
    'common.cancel': 'Kanselahin',
    'common.back': 'Bumalik',
    'common.viewDetails': 'Tingnan ang Detalye',
    'common.addToList': 'Idagdag sa Listahan',
  },
};

const NOTIF_KEY = 'ac_notifications';
const A11Y_KEY = 'ac_accessibility';

const defaultNotifications: NotificationSettings = {
  friendActivity: true,
  friendRequests: true,
  newReleases: true,
  aiRecommendations: true,
};

const defaultAccessibility: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('absolutecinema_language');
    return (saved as Language) || 'en';
  });

  const [notifications, setNotificationsState] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      return saved ? JSON.parse(saved) : defaultNotifications;
    } catch { return defaultNotifications; }
  });

  const [accessibility, setAccessibilityState] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(A11Y_KEY);
      return saved ? JSON.parse(saved) : defaultAccessibility;
    } catch { return defaultAccessibility; }
  });

  useEffect(() => {
    localStorage.setItem('absolutecinema_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(A11Y_KEY, JSON.stringify(accessibility));
    // Apply accessibility effects to document
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', accessibility.reduceMotion);
    root.classList.toggle('high-contrast', accessibility.highContrast);
    root.classList.toggle('large-text', accessibility.largeText);
  }, [accessibility]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  const setNotifications = (n: NotificationSettings) => setNotificationsState(n);

  const setAccessibility = (a: AccessibilitySettings) => setAccessibilityState(a);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, t, notifications, setNotifications, accessibility, setAccessibility }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
