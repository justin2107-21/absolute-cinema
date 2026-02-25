import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Star, Check, Bookmark, Tv, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedContent } from '@/lib/unified-content';

interface UnifiedCardProps {
  content: UnifiedContent;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function UnifiedCard({ content, onClick, size = 'md' }: UnifiedCardProps) {
  const sizeClasses = {
    sm: 'w-28 h-40',
    md: 'w-36 h-52',
    lg: 'w-44 h-64',
  };

  const releaseYear = content.releaseDate?.split('-')[0];
  const rating = content.rating?.toFixed(1);

  const typeBadge = content.type === 'anime' ? (
    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-medium flex items-center gap-0.5">
      <Play className="h-2.5 w-2.5" /> Anime
    </span>
  ) : content.type === 'tv' ? (
    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-accent/90 text-accent-foreground text-[10px] font-medium flex items-center gap-0.5">
      <Tv className="h-2.5 w-2.5" /> TV
    </span>
  ) : null;

  return (
    <motion.div
      className={cn("relative flex-shrink-0 cursor-pointer", sizeClasses[size])}
      onClick={onClick}
      whileHover={{ scale: 1.05, zIndex: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        {content.poster ? (
          <img
            src={content.poster}
            alt={content.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-xs text-muted-foreground text-center p-2">
              {content.title}
            </span>
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-background/80 backdrop-blur-sm px-2 py-1">
          <Star className="h-3 w-3 fill-accent text-accent" />
          <span className="text-xs font-semibold">{rating}</span>
        </div>

        {/* Type badge */}
        {typeBadge}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-white text-[10px] font-medium line-clamp-2">{content.title}</p>
          <div className="flex items-center gap-1 text-white/70 text-[9px]">
            {releaseYear && <span>{releaseYear}</span>}
            {content.episodes && <span>• {content.episodes} eps</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
