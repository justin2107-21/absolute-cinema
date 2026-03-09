import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatTheme {
  id: string;
  name: string;
  // Bubble styles (Tailwind classes)
  sentBubble: string;
  sentText: string;
  receivedBubble: string;
  receivedText: string;
  // Full-screen background styles (Messenger-style, CSS values)
  chatBg: string;
  headerBg: string;
  headerBorderColor: string;
  inputBg: string;
  inputBorderColor: string;
  dateBadgeBg: string;
  dateBadgeText: string;
  // Preview & accent
  accent: string;
  preview: [string, string];
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Default',
    sentBubble: 'bg-primary',
    sentText: 'text-primary-foreground',
    receivedBubble: 'bg-secondary',
    receivedText: 'text-foreground',
    chatBg: 'hsl(var(--background))',
    headerBg: 'hsl(var(--background) / 0.85)',
    headerBorderColor: 'hsl(var(--border))',
    inputBg: 'hsl(var(--background) / 0.85)',
    inputBorderColor: 'hsl(var(--border))',
    dateBadgeBg: 'hsl(var(--secondary) / 0.5)',
    dateBadgeText: 'hsl(var(--muted-foreground))',
    accent: 'hsl(var(--primary))',
    preview: ['hsl(var(--primary))', 'hsl(var(--secondary))'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    sentBubble: 'bg-[hsl(210,90%,50%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(210,35%,22%)]',
    receivedText: 'text-[hsl(210,50%,92%)]',
    chatBg: 'linear-gradient(160deg, #060f1f 0%, #0d1f38 60%, #091826 100%)',
    headerBg: 'rgba(6,15,31,0.92)',
    headerBorderColor: 'rgba(30,80,160,0.3)',
    inputBg: 'rgba(6,15,31,0.92)',
    inputBorderColor: 'rgba(30,80,160,0.3)',
    dateBadgeBg: 'rgba(20,60,120,0.55)',
    dateBadgeText: 'hsl(210,60%,78%)',
    accent: 'hsl(210,90%,50%)',
    preview: ['hsl(210,90%,50%)', 'hsl(210,40%,20%)'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    sentBubble: 'bg-gradient-to-br from-[hsl(25,95%,55%)] to-[hsl(350,85%,55%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(25,30%,20%)]',
    receivedText: 'text-[hsl(25,50%,90%)]',
    chatBg: 'linear-gradient(160deg, #1a0b06 0%, #2d1508 60%, #1f0d08 100%)',
    headerBg: 'rgba(26,11,6,0.92)',
    headerBorderColor: 'rgba(180,70,20,0.3)',
    inputBg: 'rgba(26,11,6,0.92)',
    inputBorderColor: 'rgba(180,70,20,0.3)',
    dateBadgeBg: 'rgba(120,45,10,0.55)',
    dateBadgeText: 'hsl(25,60%,78%)',
    accent: 'hsl(25,95%,55%)',
    preview: ['hsl(25,95%,55%)', 'hsl(25,30%,18%)'],
  },
  {
    id: 'forest',
    name: 'Forest',
    sentBubble: 'bg-[hsl(150,60%,40%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(150,25%,20%)]',
    receivedText: 'text-[hsl(150,40%,88%)]',
    chatBg: 'linear-gradient(160deg, #050f08 0%, #0b1f10 60%, #071408 100%)',
    headerBg: 'rgba(5,15,8,0.92)',
    headerBorderColor: 'rgba(20,100,50,0.3)',
    inputBg: 'rgba(5,15,8,0.92)',
    inputBorderColor: 'rgba(20,100,50,0.3)',
    dateBadgeBg: 'rgba(15,70,35,0.55)',
    dateBadgeText: 'hsl(150,50%,72%)',
    accent: 'hsl(150,60%,40%)',
    preview: ['hsl(150,60%,40%)', 'hsl(150,25%,18%)'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    sentBubble: 'bg-gradient-to-br from-[hsl(270,70%,60%)] to-[hsl(290,60%,50%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(270,30%,22%)]',
    receivedText: 'text-[hsl(270,50%,90%)]',
    chatBg: 'linear-gradient(160deg, #0d0618 0%, #1a0c2e 60%, #12081f 100%)',
    headerBg: 'rgba(13,6,24,0.92)',
    headerBorderColor: 'rgba(100,40,180,0.3)',
    inputBg: 'rgba(13,6,24,0.92)',
    inputBorderColor: 'rgba(100,40,180,0.3)',
    dateBadgeBg: 'rgba(70,25,130,0.55)',
    dateBadgeText: 'hsl(270,55%,78%)',
    accent: 'hsl(270,70%,60%)',
    preview: ['hsl(270,70%,60%)', 'hsl(270,30%,20%)'],
  },
  {
    id: 'cherry',
    name: 'Cherry',
    sentBubble: 'bg-gradient-to-br from-[hsl(340,80%,55%)] to-[hsl(350,90%,45%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(340,25%,20%)]',
    receivedText: 'text-[hsl(340,50%,90%)]',
    chatBg: 'linear-gradient(160deg, #1a0610 0%, #2d0c1e 60%, #1f0814 100%)',
    headerBg: 'rgba(26,6,16,0.92)',
    headerBorderColor: 'rgba(180,30,80,0.3)',
    inputBg: 'rgba(26,6,16,0.92)',
    inputBorderColor: 'rgba(180,30,80,0.3)',
    dateBadgeBg: 'rgba(120,20,55,0.55)',
    dateBadgeText: 'hsl(340,55%,78%)',
    accent: 'hsl(340,80%,55%)',
    preview: ['hsl(340,80%,55%)', 'hsl(340,25%,18%)'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    sentBubble: 'bg-[hsl(230,60%,45%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(230,30%,18%)]',
    receivedText: 'text-[hsl(230,40%,85%)]',
    chatBg: 'linear-gradient(160deg, #020508 0%, #061020 60%, #040810 100%)',
    headerBg: 'rgba(2,5,8,0.92)',
    headerBorderColor: 'rgba(30,50,150,0.3)',
    inputBg: 'rgba(2,5,8,0.92)',
    inputBorderColor: 'rgba(30,50,150,0.3)',
    dateBadgeBg: 'rgba(15,30,90,0.55)',
    dateBadgeText: 'hsl(230,45%,72%)',
    accent: 'hsl(230,60%,45%)',
    preview: ['hsl(230,60%,45%)', 'hsl(230,30%,15%)'],
  },
  {
    id: 'neon',
    name: 'Neon',
    sentBubble: 'bg-gradient-to-br from-[hsl(160,100%,45%)] to-[hsl(180,100%,40%)]',
    sentText: 'text-[hsl(160,100%,5%)]',
    receivedBubble: 'bg-[hsl(160,30%,14%)]',
    receivedText: 'text-[hsl(160,80%,80%)]',
    chatBg: 'linear-gradient(160deg, #020a06 0%, #051408 60%, #031008 100%)',
    headerBg: 'rgba(2,10,6,0.92)',
    headerBorderColor: 'rgba(0,180,100,0.25)',
    inputBg: 'rgba(2,10,6,0.92)',
    inputBorderColor: 'rgba(0,180,100,0.25)',
    dateBadgeBg: 'rgba(0,100,55,0.45)',
    dateBadgeText: 'hsl(160,75%,72%)',
    accent: 'hsl(160,100%,45%)',
    preview: ['hsl(160,100%,45%)', 'hsl(160,30%,12%)'],
  },
];

export function getChatTheme(conversationId: string): ChatTheme {
  try {
    const stored = localStorage.getItem(`chat_theme_${conversationId}`);
    if (stored) {
      const theme = CHAT_THEMES.find(t => t.id === stored);
      if (theme) return theme;
    }
  } catch {}
  return CHAT_THEMES[0];
}

export function setChatTheme(conversationId: string, themeId: string) {
  localStorage.setItem(`chat_theme_${conversationId}`, themeId);
}

interface ChatThemePickerProps {
  conversationId: string;
  currentThemeId: string;
  onSelect: (theme: ChatTheme) => void;
}

export function ChatThemePicker({ conversationId, currentThemeId, onSelect }: ChatThemePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium px-1">Choose a theme</p>
      <div className="grid grid-cols-4 gap-3">
        {CHAT_THEMES.map(theme => {
          const isActive = theme.id === currentThemeId;
          return (
            <button
              key={theme.id}
              onClick={() => {
                setChatTheme(conversationId, theme.id);
                onSelect(theme);
              }}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all',
                isActive ? 'bg-secondary ring-2 ring-primary' : 'hover:bg-secondary/50'
              )}
            >
              <div className="relative w-10 h-10 rounded-full flex items-center justify-center">
                <div
                  className="absolute top-0 right-0 w-6 h-6 rounded-full border-2 border-background"
                  style={{ backgroundColor: theme.preview[0] }}
                />
                <div
                  className="absolute bottom-0 left-0 w-6 h-6 rounded-full border-2 border-background"
                  style={{ backgroundColor: theme.preview[1] }}
                />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{theme.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
