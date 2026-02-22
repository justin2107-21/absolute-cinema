import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Star, Play, Calendar, Film, Tv, LayoutGrid, X, Sparkles, Gem, Shuffle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieRowSkeleton } from '@/components/movies/MovieSkeleton';
import { HeroSlider } from '@/components/home/HeroSlider';

import { getDiversifiedHomeContent } from '@/lib/tmdb';
import { getPersonalizedRecommendations, getDiverseDiscovery } from '@/lib/recommendations';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function Home() {
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched, watched, watchlist } = useWatchlist();
  const [showCategories, setShowCategories] = useState(false);

  const { data: homeContent, isLoading } = useQuery({
    queryKey: ['home-diversified'],
    queryFn: getDiversifiedHomeContent,
    staleTime: 1000 * 60 * 5,
  });

  // Personalized recommendations based on watch history
  const { data: personalRecs } = useQuery({
    queryKey: ['personalized-recs', watched.length],
    queryFn: () => getPersonalizedRecommendations(watched, watchlist),
    enabled: watched.length >= 3,
    staleTime: 1000 * 60 * 30,
  });

  // Diverse discovery for new users
  const { data: discovery } = useQuery({
    queryKey: ['diverse-discovery'],
    queryFn: getDiverseDiscovery,
    enabled: watched.length < 3,
    staleTime: 1000 * 60 * 10,
  });

  const handleCategorySelect = (genreId: number, genreName: string) => {
    setShowCategories(false);
    navigate(`/search?genre=${genreId}&genreName=${genreName}`);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Auto-sliding Hero */}
        {homeContent?.trending && homeContent.trending.length > 0 ? (
          <HeroSlider 
            movies={homeContent.trending} 
            onAddToWatchlist={addToWatchlist}
          />
        ) : (
          <div className="h-[55vh] bg-gradient-to-b from-primary/10 to-background animate-pulse" />
        )}

        {/* Quick Filter Buttons */}
        <section className="px-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/movies')}
              className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50"
            >
              <Film className="h-4 w-4" />
              Movies
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tv-series')}
              className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50"
            >
              <Tv className="h-4 w-4" />
              TV Series
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategories(true)}
              className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50"
            >
              <LayoutGrid className="h-4 w-4" />
              Categories
            </Button>
          </div>
        </section>

        {/* Categories Modal */}
        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
              onClick={() => setShowCategories(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              
              {/* Dropdown Content */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground">Categories</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCategories(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Genre List */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => handleCategorySelect(genre.id, genre.name)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground/90 hover:text-foreground"
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movie Rows - Using diversified content */}
        {isLoading ? (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        ) : (
          <>
            <MovieRow title="Trending Now" subtitle="What everyone's watching today" icon={<TrendingUp className="h-5 w-5" />}>
              {homeContent?.trending.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
              ))}
            </MovieRow>

            {/* Personalized recommendations for returning users */}
            {personalRecs?.forYou && personalRecs.forYou.length > 0 && (
              <MovieRow title="For You" subtitle="Based on your watch history" icon={<Sparkles className="h-5 w-5" />}>
                {personalRecs.forYou.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {personalRecs?.genreMix && personalRecs.genreMix.length > 0 && (
              <MovieRow title="Genre Mix" subtitle="From your favorite genres" icon={<Shuffle className="h-5 w-5" />}>
                {personalRecs.genreMix.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {personalRecs?.hiddenGems && personalRecs.hiddenGems.length > 0 && (
              <MovieRow title="Hidden Gems" subtitle="Highly rated discoveries" icon={<Gem className="h-5 w-5" />}>
                {personalRecs.hiddenGems.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {/* Discovery for new users */}
            {discovery && discovery.length > 0 && (
              <MovieRow title="Discover" subtitle="Explore something new" icon={<Shuffle className="h-5 w-5" />}>
                {discovery.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            <MovieRow title="Popular This Week" subtitle="Fan favorites" icon={<Star className="h-5 w-5" />}>
              {homeContent?.popular.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
              ))}
            </MovieRow>

            <MovieRow title="Top Rated" subtitle="Critically acclaimed" icon={<Star className="h-5 w-5" />}>
              {homeContent?.topRated.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
              ))}
            </MovieRow>

            <MovieRow title="In Theaters" subtitle="Now showing" icon={<Play className="h-5 w-5" />}>
              {homeContent?.nowPlaying.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
              ))}
            </MovieRow>

            <MovieRow title="Coming Soon" subtitle="Mark your calendar" icon={<Calendar className="h-5 w-5" />}>
              {homeContent?.upcoming.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
              ))}
            </MovieRow>
          </>
        )}
      </div>
    </AppLayout>
  );
}