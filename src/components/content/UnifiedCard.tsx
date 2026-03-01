import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Check, Play, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UnifiedContent } from '@/lib/unified-content';

interface UnifiedCardProps {
  content: UnifiedContent;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTypeBadge?: boolean;
}

export function UnifiedCard({ content, onClick, size = 'md', showTypeBadge = false }: UnifiedCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-28 h-40',
    md: 'w-36 h-52',
    lg: 'w-44 h-64',
  };

  const releaseYear = content.releaseDate?.split('-')[0];
  const rating = content.rating?.toFixed(1);

  return (
    <motion.div
      className={cn("relative flex-shrink-0 cursor-pointer", sizeClasses[size])}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.05, zIndex: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Base poster card */}
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

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Hover card - matches MovieCard */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute -inset-4 z-30 rounded-2xl overflow-hidden bg-card shadow-2xl border border-border"
            style={{ minWidth: '280px', minHeight: '320px' }}
          >
            {/* Backdrop */}
            <div className="relative h-36 w-full bg-secondary">
              {content.backdrop ? (
                <img src={content.backdrop} alt={content.title} className="h-full w-full object-cover" />
              ) : content.poster ? (
                <img src={content.poster} alt={content.title} className="h-full w-full object-cover blur-sm" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-foreground line-clamp-1">{content.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  {releaseYear && <span>{releaseYear}</span>}
                  {releaseYear && <span>•</span>}
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <span>{rating}</span>
                  </div>
                  {content.episodes && (
                    <>
                      <span>•</span>
                      <span>{content.episodes} eps</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {content.description || 'No description available.'}
              </p>
              {content.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {content.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{g}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
