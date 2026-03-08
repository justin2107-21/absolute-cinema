import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Star, Play, Calendar, Film, Tv, LayoutGrid, X, Sparkles, Gem, Shuffle, Crown, Clock, Trophy, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieRowSkeleton } from '@/components/movies/MovieSkeleton';
import { HeroSlider } from '@/components/home/HeroSlider';
import { UnifiedCard } from '@/components/content/UnifiedCard';
import { CategoryResults } from '@/components/home/CategoryResults';

import { getDiversifiedHomeContent } from '@/lib/tmdb';
import { getTrendingAnime, getUpcomingNextSeasonAnime, getAllTimePopularAnime, getTop100Anime } from '@/lib/anilist';
import { anilistToUnified, getContentPath } from '@/lib/unified-content';
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
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null);
  const { data: homeContent, isLoading } = useQuery({
    queryKey: ['home-diversified'],
    queryFn: getDiversifiedHomeContent,
    staleTime: 1000 * 60 * 5,
  });

  // Trending Anime from AniList - resilient to failures
  const { data: trendingAnime } = useQuery({
    queryKey: ['trending-anime-home'],
    queryFn: getTrendingAnime,
    staleTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const { data: upcomingAnime } = useQuery({
    queryKey: ['upcoming-anime-home'],
    queryFn: getUpcomingNextSeasonAnime,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  const { data: allTimePopularAnime } = useQuery({
    queryKey: ['alltime-popular-anime-home'],
    queryFn: getAllTimePopularAnime,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  const { data: top100Anime } = useQuery({
    queryKey: ['top100-anime-home'],
    queryFn: () => getTop100Anime(1),
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  const trendingAnimeUnified = trendingAnime?.slice(0, 10).map(anilistToUnified) || [];
  const upcomingAnimeUnified = upcomingAnime?.slice(0, 10).map(anilistToUnified) || [];
  const allTimePopularUnified = allTimePopularAnime?.slice(0, 10).map(anilistToUnified) || [];
  const top100AnimeUnified = top100Anime?.slice(0, 10).map(anilistToUnified) || [];

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
    setSelectedCategory({ id: genreId, name: genreName });
  };

  // If a category is selected, show category results
  if (selectedCategory) {
    return (
      <AppLayout>
        <CategoryResults
          genreId={selectedCategory.id}
          genreName={selectedCategory.name}
          onBack={() => setSelectedCategory(null)}
        />
      </AppLayout>
    );
  }

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
            <Button variant="outline" size="sm" onClick={() => navigate('/movies')} className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50">
              <Film className="h-4 w-4" /> Movies
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/tv-series')} className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50">
              <Tv className="h-4 w-4" /> TV Series
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCategories(true)} className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50">
              <LayoutGrid className="h-4 w-4" /> Categories
            </Button>
          </div>
        </section>

        {/* Categories Modal */}
        <AnimatePresence>
          {showCategories && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={() => setShowCategories(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-10">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground">Categories</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowCategories(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {GENRES.map((genre) => (
                    <button key={genre.id} onClick={() => handleCategorySelect(genre.id, genre.name)} className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground/90 hover:text-foreground">
                      {genre.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movie Rows - grouped by section */}
        {isLoading ? (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        ) : (
          <>
            {/* ——— Trending Section ——— */}
            <section className="space-y-4" aria-label="Trending">
              <div className="px-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trending</h2>
              </div>
              <MovieRow title="Trending Now" subtitle="What everyone's watching today">
                {homeContent?.trending.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
              {trendingAnimeUnified.length > 0 && (
                <MovieRow title="Trending Anime" subtitle="Popular anime right now">
                  {trendingAnimeUnified.map((content) => (
                    <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                  ))}
                </MovieRow>
              )}
            </section>

            {/* ——— Movies & Shows Section ——— */}
            <section className="space-y-4" aria-label="Movies & Shows">
              <div className="px-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Movies & Shows</h2>
              </div>
              <MovieRow title="In Theaters" subtitle="Now showing">
                {homeContent?.nowPlaying.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
              <MovieRow title="Coming Soon" subtitle="Mark your calendar">
                {homeContent?.upcoming.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
              <MovieRow title="Top Rated" subtitle="Critically acclaimed">
                {homeContent?.topRated.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
              <MovieRow title="Popular This Week" subtitle="Fan favorites">
                {homeContent?.popular.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            </section>

            {/* ——— Anime Section ——— */}
            <section className="space-y-4" aria-label="Anime">
              <div className="px-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Anime</h2>
              </div>
              {upcomingAnimeUnified.length > 0 && (
                <MovieRow title="Upcoming Next Season" subtitle="Anime airing next season">
                  {upcomingAnimeUnified.map((content) => (
                    <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} hideRating />
                  ))}
                </MovieRow>
              )}
              {allTimePopularUnified.length > 0 && (
                <MovieRow title="All-Time Popular Anime" subtitle="The most popular anime ever">
                  {allTimePopularUnified.map((content) => (
                    <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                  ))}
                </MovieRow>
              )}
              {top100AnimeUnified.length > 0 && (
                <MovieRow
                  title="Top 100 Anime"
                  subtitle="Highest rated of all time"
                  rightAction={
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate('/top-anime')}>
                      View All Top 100 Anime <ChevronRight className="h-4 w-4" />
                    </Button>
                  }
                >
                  {top100AnimeUnified.map((content, index) => (
                    <UnifiedCard
                      key={content.id}
                      content={content}
                      size="sm"
                      rank={index + 1}
                      onClick={() => navigate(getContentPath(content))}
                    />
                  ))}
                </MovieRow>
              )}
            </section>

            {/* ——— Personalized / Discovery (existing functionality) ——— */}
            {personalRecs?.forYou && personalRecs.forYou.length > 0 && (
              <MovieRow title="For You" subtitle="Based on your watch history">
                {personalRecs.forYou.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {personalRecs?.genreMix && personalRecs.genreMix.length > 0 && (
              <MovieRow title="Genre Mix" subtitle="From your favorite genres">
                {personalRecs.genreMix.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {personalRecs?.hiddenGems && personalRecs.hiddenGems.length > 0 && (
              <MovieRow title="Hidden Gems" subtitle="Highly rated discoveries">
                {personalRecs.hiddenGems.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}

            {discovery && discovery.length > 0 && (
              <MovieRow title="Discover" subtitle="Explore something new">
                {discovery.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                ))}
              </MovieRow>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
