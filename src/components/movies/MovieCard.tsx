import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Star, Check } from 'lucide-react';
import { Movie, getImageUrl, getMovieDetails } from '@/lib/tmdb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface MovieCardProps {
  movie: Movie;
  onAddToWatchlist?: (movie: Movie) => void;
  onMarkWatched?: (movie: Movie) => void;
  onClick?: (movie: Movie) => void;
  isInWatchlist?: boolean;
  isWatched?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MovieCard({
  movie,
  onAddToWatchlist,
  onMarkWatched,
  onClick,
  isInWatchlist = false,
  isWatched = false,
  size = 'md',
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const posterUrl = getImageUrl(movie.poster_path, size === 'sm' ? 'w200' : 'w300');

  const { data: movieDetails } = useQuery({
    queryKey: ['movieDetails', movie.id],
    queryFn: () => getMovieDetails(movie.id),
    enabled: isHovered,
  });

  const trailer = movieDetails?.videos?.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  const sizeClasses = {
    sm: 'w-24 h-36',
    md: 'w-28 h-40',
    lg: 'w-36 h-54',
  };

  const releaseYear = movie.release_date?.split('-')[0];
  const rating = movie.vote_average?.toFixed(1);

  return (
    <motion.div
      className={cn("relative flex-shrink-0 cursor-pointer", sizeClasses[size])}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(movie)}
      whileHover={{ scale: 1.05, zIndex: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Base poster card */}
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <span className="text-xs text-muted-foreground text-center p-2">
              {movie.title}
            </span>
          </div>
        )}
        
        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-background/80 backdrop-blur-sm px-2 py-1">
          <Star className="h-3 w-3 fill-accent text-accent" />
          <span className="text-xs font-semibold">{rating}</span>
        </div>

        {/* Status indicator */}
        {isWatched && (
          <div className="absolute top-2 left-2 rounded-lg bg-cinema-green/90 p-1.5">
            <Check className="h-3 w-3" />
          </div>
        )}
        {isInWatchlist && !isWatched && (
          <div className="absolute top-2 left-2 rounded-lg bg-primary/90 p-1.5">
            <Bookmark className="h-3 w-3" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Hover card - expands on hover */}
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
            {/* Trailer or backdrop */}
            <div className="relative h-36 w-full bg-secondary">
              {trailer ? (
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}`}
                  className="h-full w-full object-cover"
                  allow="autoplay"
                  title={movie.title}
                />
              ) : movie.backdrop_path ? (
                <img
                  src={getImageUrl(movie.backdrop_path, 'w780') || ''}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={posterUrl || ''}
                  alt={movie.title}
                  className="h-full w-full object-cover blur-sm"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-foreground line-clamp-1">{movie.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{releaseYear}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <span>{rating}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {movie.overview || 'No description available.'}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isInWatchlist ? "secondary" : "default"}
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToWatchlist?.(movie);
                  }}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="h-4 w-4" />
                      In List
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Watchlist
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkWatched?.(movie);
                  }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Inline import for Bookmark icon
import { Bookmark } from 'lucide-react';
