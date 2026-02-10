import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MoodType = 
  | 'default'
  | 'happy' 
  | 'sad' 
  | 'stressed' 
  | 'romantic' 
  | 'excited' 
  | 'relaxed'
  | 'lonely'
  | 'anxious'
  | 'burnedout'
  | 'overwhelmed'
  | 'nostalgic'
  | 'heartbroken'
  | 'motivated'
  | 'bored'
  | 'hopeful'
  | 'curious';

interface MoodTheme {
  primary: string;
  accent: string;
  glow: string;
  gradient: string;
}

export const moodThemes: Record<MoodType, MoodTheme> = {
  default: {
    primary: '263 70% 58%',
    accent: '32 95% 60%',
    glow: '263 70% 58%',
    gradient: 'from-primary/20 to-accent/10',
  },
  happy: {
    primary: '45 95% 55%',
    accent: '32 95% 60%',
    glow: '45 95% 55%',
    gradient: 'from-yellow-500/20 to-orange-400/10',
  },
  sad: {
    primary: '250 60% 55%',
    accent: '220 40% 50%',
    glow: '250 60% 55%',
    gradient: 'from-purple-500/20 to-gray-500/10',
  },
  stressed: {
    primary: '200 70% 55%',
    accent: '210 50% 60%',
    glow: '200 70% 55%',
    gradient: 'from-blue-400/20 to-gray-400/10',
  },
  romantic: {
    primary: '340 75% 60%',
    accent: '350 80% 65%',
    glow: '340 75% 60%',
    gradient: 'from-pink-500/20 to-red-400/10',
  },
  excited: {
    primary: '25 95% 55%',
    accent: '15 95% 60%',
    glow: '25 95% 55%',
    gradient: 'from-orange-500/20 to-coral-400/10',
  },
  relaxed: {
    primary: '180 60% 50%',
    accent: '200 70% 55%',
    glow: '180 60% 50%',
    gradient: 'from-teal-400/20 to-blue-400/10',
  },
  lonely: {
    primary: '220 50% 50%',
    accent: '230 40% 55%',
    glow: '220 50% 50%',
    gradient: 'from-blue-500/20 to-indigo-400/10',
  },
  anxious: {
    primary: '190 60% 50%',
    accent: '200 50% 55%',
    glow: '190 60% 50%',
    gradient: 'from-cyan-400/20 to-blue-400/10',
  },
  burnedout: {
    primary: '30 30% 50%',
    accent: '25 25% 55%',
    glow: '30 30% 50%',
    gradient: 'from-amber-600/20 to-gray-500/10',
  },
  overwhelmed: {
    primary: '270 50% 55%',
    accent: '280 45% 60%',
    glow: '270 50% 55%',
    gradient: 'from-violet-500/20 to-purple-400/10',
  },
  nostalgic: {
    primary: '35 60% 55%',
    accent: '40 50% 60%',
    glow: '35 60% 55%',
    gradient: 'from-amber-400/20 to-yellow-500/10',
  },
  heartbroken: {
    primary: '350 50% 45%',
    accent: '340 40% 50%',
    glow: '350 50% 45%',
    gradient: 'from-rose-600/20 to-gray-500/10',
  },
  motivated: {
    primary: '150 70% 45%',
    accent: '160 65% 50%',
    glow: '150 70% 45%',
    gradient: 'from-green-500/20 to-emerald-400/10',
  },
  bored: {
    primary: '220 30% 55%',
    accent: '210 25% 60%',
    glow: '220 30% 55%',
    gradient: 'from-slate-400/20 to-gray-400/10',
  },
  hopeful: {
    primary: '170 70% 50%',
    accent: '180 65% 55%',
    glow: '170 70% 50%',
    gradient: 'from-teal-400/20 to-cyan-400/10',
  },
  curious: {
    primary: '280 65% 55%',
    accent: '290 60% 60%',
    glow: '280 65% 55%',
    gradient: 'from-purple-400/20 to-violet-400/10',
  },
};

interface MoodContextType {
  currentMood: MoodType;
  setMood: (mood: MoodType) => void;
  theme: MoodTheme;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export function MoodProvider({ children }: { children: ReactNode }) {
  const [currentMood, setCurrentMood] = useState<MoodType>(() => {
    const saved = localStorage.getItem('absolutecinema_mood');
    if (saved && saved in moodThemes) return saved as MoodType;
    return 'default';
  });
  const theme = moodThemes[currentMood];

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme with transition
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--ring', theme.primary);
    root.style.setProperty('--shadow-glow', `0 0 40px hsl(${theme.glow} / 0.3)`);
    root.style.setProperty('--shadow-button', `0 4px 16px hsl(${theme.glow} / 0.4)`);
    
    // Add transition class
    root.classList.add('theme-transitioning');
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 500);

    return () => clearTimeout(timeout);
  }, [theme]);

  const setMood = (mood: MoodType) => {
    setCurrentMood(mood);
    localStorage.setItem('absolutecinema_mood', mood);
  };

  return (
    <MoodContext.Provider value={{ currentMood, setMood, theme }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
}
