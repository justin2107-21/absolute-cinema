import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Play, Plus } from 'lucide-react';
import { Movie, getImageUrl } from '@/lib/tmdb';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  movies: Movie[];
  onAddToWatchlist?: (movie: Movie) => void;
  autoPlayInterval?: number;
}

export function HeroSlider({ 
  movies, 
  onAddToWatchlist,
  autoPlayInterval = 5000 
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigate = useNavigate();

  const displayMovies = movies.slice(0, 5);
  const currentMovie = displayMovies[currentIndex];

  useEffect(() => {
    if (!isAutoPlaying || displayMovies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayMovies.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayMovies.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of no interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    goToSlide((currentIndex - 1 + displayMovies.length) % displayMovies.length);
  };

  const goToNext = () => {
    goToSlide((currentIndex + 1) % displayMovies.length);
  };

  if (!currentMovie) return null;

  return (
    <div 
      className="relative min-h-[55vh] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {currentMovie.backdrop_path && (
            <img
              src={getImageUrl(currentMovie.backdrop_path, 'original') || ''}
              alt={currentMovie.title}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[55vh] px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMovie.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 max-w-lg"
          >
            {/* Badge & Rating */}
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-md bg-accent/90 text-accent-foreground text-xs font-semibold uppercase">
                Featured
              </span>
              <div className="flex items-center gap-1 text-accent">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{currentMovie.vote_average.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentMovie.release_date?.split('-')[0]}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              {currentMovie.title}
            </h2>

            {/* Overview */}
            <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
              {currentMovie.overview}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                className="gap-2"
                onClick={() => navigate(`/movie/${currentMovie.id}`)}
              >
                <Play className="h-4 w-4" />
                View Details
              </Button>
              <Button 
                variant="glass" 
                className="gap-2"
                onClick={() => onAddToWatchlist?.(currentMovie)}
              >
                <Plus className="h-4 w-4" />
                Add to List
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {displayMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      </div>

      {/* Progress bar for auto-play */}
      {isAutoPlaying && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-primary z-20"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: autoPlayInterval / 1000, ease: 'linear' }}
          key={currentIndex}
        />
      )}
    </div>
  );
}
