import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LayoutGrid, X, TrendingUp, Star, Play, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieRowSkeleton } from '@/components/movies/MovieSkeleton';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import { getTVContent, type TVShow } from '@/lib/tmdb';

const TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
].sort((a, b) => a.name.localeCompare(b.name));

// Adapter to convert TVShow to Movie format for MovieCard
const adaptTVToMovie = (show: TVShow) => ({
  id: show.id,
  title: show.name,
  overview: show.overview,
  poster_path: show.poster_path,
  backdrop_path: show.backdrop_path,
  release_date: show.first_air_date,
  vote_average: show.vote_average,
  vote_count: show.vote_count,
  genre_ids: show.genre_ids,
  popularity: show.popularity,
});

export default function TVSeries() {
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();
  const [showCategories, setShowCategories] = useState(false);

  const { data: tvContent, isLoading } = useQuery({
    queryKey: ['tv-content'],
    queryFn: getTVContent,
    staleTime: 1000 * 60 * 5,
  });

  const handleCategorySelect = (genreId: number, genreName: string) => {
    setShowCategories(false);
    navigate(`/search?genre=${genreId}&genreName=${genreName}&type=tv`);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header with back button */}
        <header className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-border/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">TV Series</h1>
        </header>

        {/* Categories Button */}
        <section className="px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border-border/50"
          >
            <LayoutGrid className="h-4 w-4" />
            Categories
          </Button>
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
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-10"
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground">TV Categories</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCategories(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="max-h-80 overflow-y-auto p-2">
                  {TV_GENRES.map((genre) => (
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

        {/* TV Rows - Netflix style */}
        {isLoading ? (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        ) : (
          <>
            <MovieRow title="Trending TV Shows" subtitle="What everyone's watching" icon={<TrendingUp className="h-5 w-5" />}>
              {tvContent?.trending.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={adaptTVToMovie(show)} 
                  mediaType="tv"
                  onAddToWatchlist={addToWatchlist} 
                  onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/tv/${show.id}`)} 
                  isInWatchlist={isInWatchlist(show.id)} 
                  isWatched={isWatched(show.id)} 
                />
              ))}
            </MovieRow>

            <MovieRow title="Popular TV Shows" subtitle="Fan favorites" icon={<Star className="h-5 w-5" />}>
              {tvContent?.popular.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={adaptTVToMovie(show)} 
                  mediaType="tv"
                  onAddToWatchlist={addToWatchlist} 
                  onMarkWatched={markAsWatchlist}
                  onClick={() => navigate(`/tv/${show.id}`)} 
                  isInWatchlist={isInWatchlist(show.id)} 
                  isWatched={isWatched(show.id)} 
                />
              ))}
            </MovieRow>

            <MovieRow title="Top Rated TV Shows" subtitle="Critically acclaimed" icon={<Star className="h-5 w-5" />}>
              {tvContent?.topRated.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={adaptTVToMovie(show)} 
                  mediaType="tv"
                  onAddToWatchlist={addToWatchlist} 
                  onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/tv/${show.id}`)} 
                  isInWatchlist={isInWatchlist(show.id)} 
                  isWatched={isWatched(show.id)} 
                />
              ))}
            </MovieRow>

            <MovieRow title="Airing Today" subtitle="New episodes" icon={<Play className="h-5 w-5" />}>
              {tvContent?.airingToday.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={adaptTVToMovie(show)} 
                  mediaType="tv"
                  onAddToWatchlist={addToWatchlist} 
                  onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/tv/${show.id}`)} 
                  isInWatchlist={isInWatchlist(show.id)} 
                  isWatched={isWatched(show.id)} 
                />
              ))}
            </MovieRow>

            <MovieRow title="On The Air" subtitle="Current season" icon={<Calendar className="h-5 w-5" />}>
              {tvContent?.onTheAir.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={adaptTVToMovie(show)} 
                  mediaType="tv"
                  onAddToWatchlist={addToWatchlist} 
                  onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/tv/${show.id}`)} 
                  isInWatchlist={isInWatchlist(show.id)} 
                  isWatched={isWatched(show.id)} 
                />
              ))}
            </MovieRow>
          </>
        )}
      </div>
    </AppLayout>
  );
}
