import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatTheme {
  id: string;
  name: string;
  sentBubble: string;
  sentText: string;
  receivedBubble: string;
  receivedText: string;
  accent: string;
  preview: [string, string]; // [sent color, received color] for the preview dots
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Default',
    sentBubble: 'bg-primary',
    sentText: 'text-primary-foreground',
    receivedBubble: 'bg-secondary',
    receivedText: 'text-foreground',
    accent: 'hsl(var(--primary))',
    preview: ['hsl(var(--primary))', 'hsl(var(--secondary))'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    sentBubble: 'bg-[hsl(210,90%,50%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(210,40%,20%)]',
    receivedText: 'text-[hsl(210,50%,90%)]',
    accent: 'hsl(210,90%,50%)',
    preview: ['hsl(210,90%,50%)', 'hsl(210,40%,20%)'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    sentBubble: 'bg-gradient-to-br from-[hsl(25,95%,55%)] to-[hsl(350,85%,55%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(25,30%,18%)]',
    receivedText: 'text-[hsl(25,50%,90%)]',
    accent: 'hsl(25,95%,55%)',
    preview: ['hsl(25,95%,55%)', 'hsl(25,30%,18%)'],
  },
  {
    id: 'forest',
    name: 'Forest',
    sentBubble: 'bg-[hsl(150,60%,40%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(150,25%,18%)]',
    receivedText: 'text-[hsl(150,40%,88%)]',
    accent: 'hsl(150,60%,40%)',
    preview: ['hsl(150,60%,40%)', 'hsl(150,25%,18%)'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    sentBubble: 'bg-gradient-to-br from-[hsl(270,70%,60%)] to-[hsl(290,60%,50%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(270,30%,20%)]',
    receivedText: 'text-[hsl(270,50%,90%)]',
    accent: 'hsl(270,70%,60%)',
    preview: ['hsl(270,70%,60%)', 'hsl(270,30%,20%)'],
  },
  {
    id: 'cherry',
    name: 'Cherry',
    sentBubble: 'bg-gradient-to-br from-[hsl(340,80%,55%)] to-[hsl(350,90%,45%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(340,25%,18%)]',
    receivedText: 'text-[hsl(340,50%,90%)]',
    accent: 'hsl(340,80%,55%)',
    preview: ['hsl(340,80%,55%)', 'hsl(340,25%,18%)'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    sentBubble: 'bg-[hsl(230,60%,45%)]',
    sentText: 'text-white',
    receivedBubble: 'bg-[hsl(230,30%,15%)]',
    receivedText: 'text-[hsl(230,40%,85%)]',
    accent: 'hsl(230,60%,45%)',
    preview: ['hsl(230,60%,45%)', 'hsl(230,30%,15%)'],
  },
  {
    id: 'neon',
    name: 'Neon',
    sentBubble: 'bg-gradient-to-br from-[hsl(160,100%,45%)] to-[hsl(180,100%,40%)]',
    sentText: 'text-[hsl(160,100%,5%)]',
    receivedBubble: 'bg-[hsl(160,30%,12%)]',
    receivedText: 'text-[hsl(160,80%,80%)]',
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
                {/* Preview bubbles */}
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
