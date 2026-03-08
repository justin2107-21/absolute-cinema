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

import { getDiversifiedHomeContent } from '@/lib/tmdb';
import { getTrendingAnime, getUpcomingNextSeasonAnime, getAllTimePopularAnime, getTop100Anime } from '@/lib/anilist';
import { anilistToUnified, getContentPath, getScoreEmoji, formatAnimeFormat, formatSeason } from '@/lib/unified-content';
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

        {/* Movie Rows */}
        {isLoading ? (
          <>
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

            {/* Trending Anime */}
            {trendingAnimeUnified.length > 0 && (
              <MovieRow title="Trending Anime" subtitle="Popular anime right now" icon={<Sparkles className="h-5 w-5" />}>
                {trendingAnimeUnified.map((content) => (
                  <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                ))}
              </MovieRow>
            )}

            {/* Upcoming Next Season Anime */}
            {upcomingAnimeUnified.length > 0 && (
              <MovieRow title="Upcoming Next Season" subtitle="Anime airing next season" icon={<Clock className="h-5 w-5" />}>
                {upcomingAnimeUnified.map((content) => (
                  <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} hideRating />
                ))}
              </MovieRow>
            )}

            {/* All-Time Popular Anime */}
            {allTimePopularUnified.length > 0 && (
              <MovieRow title="All-Time Popular Anime" subtitle="The most popular anime ever" icon={<Crown className="h-5 w-5" />}>
                {allTimePopularUnified.map((content) => (
                  <UnifiedCard key={content.id} content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                ))}
              </MovieRow>
            )}

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

            {/* Top 100 Anime - Ranked List Preview */}
            {top100AnimeUnified.length > 0 && (
              <section className="px-4 space-y-3 mt-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-semibold">Top 100 Anime</h2>
                    <p className="text-xs text-muted-foreground">Highest rated of all time</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {top100AnimeUnified.slice(0, 10).map((content, index) => {
                    const scorePercent = content.rating ? Math.round(content.rating * 10) : null;
                    const emoji = getScoreEmoji(scorePercent);
                    const format = formatAnimeFormat(content.format);
                    const season = content.season && content.seasonYear
                      ? `${formatSeason(content.season)} ${content.seasonYear}`
                      : content.seasonYear?.toString() || '';

                    return (
                      <motion.div
                        key={content.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => navigate(getContentPath(content))}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <span className="text-sm font-bold text-primary w-7 text-right shrink-0">#{index + 1}</span>
                        <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {content.poster && <img src={content.poster} alt={content.title} className="w-full h-full object-cover" loading="lazy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{content.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {scorePercent && <span className="font-semibold text-foreground">{scorePercent}%</span>}
                            <span>{emoji}</span>
                            <span>•</span>
                            <span>{format}</span>
                            {season && <><span>•</span><span>{season}</span></>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/top-anime')}>
                  View All Top 100 Anime <ChevronRight className="h-4 w-4" />
                </Button>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
