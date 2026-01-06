import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Star, Play, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieRowSkeleton } from '@/components/movies/MovieSkeleton';
import { Button } from '@/components/ui/button';
import { getTrendingMovies, getPopularMovies, getTopRatedMovies, getNowPlayingMovies } from '@/lib/tmdb';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => getTrendingMovies('week'),
  });

  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ['popular'],
    queryFn: () => getPopularMovies(),
  });

  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ['topRated'],
    queryFn: () => getTopRatedMovies(),
  });

  const { data: nowPlaying, isLoading: nowPlayingLoading } = useQuery({
    queryKey: ['nowPlaying'],
    queryFn: () => getNowPlayingMovies(),
  });

  const featuredMovie = trending?.results[0];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <header className="relative min-h-[50vh] flex flex-col justify-end px-4 pb-8">
          {/* Background */}
          {featuredMovie?.backdrop_path ? (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={`https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path}`}
                alt={featuredMovie.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 space-y-4"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="gradient-text">Cinema</span>
                <span className="text-accent">Sync</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-sm">
                Discover movies that match your mood. Watch together.
              </p>
            </div>

            {featuredMovie && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent uppercase tracking-wider">
                    Featured
                  </span>
                  <div className="flex items-center gap-1 text-accent">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs font-semibold">
                      {featuredMovie.vote_average.toFixed(1)}
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{featuredMovie.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                  {featuredMovie.overview}
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="gap-2"
                    onClick={() => navigate(`/movie/${featuredMovie.id}`)}
                  >
                    <Play className="h-4 w-4" />
                    Details
                  </Button>
                  <Button 
                    variant="glass" 
                    className="gap-2"
                    onClick={() => addToWatchlist(featuredMovie)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Add to List
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </header>

        {/* Quick Actions */}
        <section className="px-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/mood')}
              className="glass-card p-4 flex items-center gap-3 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">MoodMatch</h3>
                <p className="text-xs text-muted-foreground">AI recommendations</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/groups')}
              className="glass-card p-4 flex items-center gap-3 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cinema-blue to-cinema-green">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Watch Party</h3>
                <p className="text-xs text-muted-foreground">With friends</p>
              </div>
            </motion.button>
          </div>
        </section>

        {/* Movie Rows */}
        {trendingLoading ? (
          <MovieRowSkeleton />
        ) : (
          <MovieRow
            title="Trending Now"
            subtitle="What everyone's watching"
            icon={<TrendingUp className="h-5 w-5" />}
          >
            {trending?.results.slice(0, 10).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={addToWatchlist}
                onMarkWatched={markAsWatched}
                onClick={() => navigate(`/movie/${movie.id}`)}
                isInWatchlist={isInWatchlist(movie.id)}
                isWatched={isWatched(movie.id)}
              />
            ))}
          </MovieRow>
        )}

        {popularLoading ? (
          <MovieRowSkeleton />
        ) : (
          <MovieRow
            title="Popular"
            subtitle="Fan favorites"
            icon={<Star className="h-5 w-5" />}
          >
            {popular?.results.slice(0, 10).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={addToWatchlist}
                onMarkWatched={markAsWatched}
                onClick={() => navigate(`/movie/${movie.id}`)}
                isInWatchlist={isInWatchlist(movie.id)}
                isWatched={isWatched(movie.id)}
              />
            ))}
          </MovieRow>
        )}

        {topRatedLoading ? (
          <MovieRowSkeleton />
        ) : (
          <MovieRow
            title="Top Rated"
            subtitle="Critically acclaimed"
            icon={<Star className="h-5 w-5" />}
          >
            {topRated?.results.slice(0, 10).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={addToWatchlist}
                onMarkWatched={markAsWatched}
                onClick={() => navigate(`/movie/${movie.id}`)}
                isInWatchlist={isInWatchlist(movie.id)}
                isWatched={isWatched(movie.id)}
              />
            ))}
          </MovieRow>
        )}

        {nowPlayingLoading ? (
          <MovieRowSkeleton />
        ) : (
          <MovieRow
            title="In Theaters"
            subtitle="Now showing"
            icon={<Play className="h-5 w-5" />}
          >
            {nowPlaying?.results.slice(0, 10).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onAddToWatchlist={addToWatchlist}
                onMarkWatched={markAsWatched}
                onClick={() => navigate(`/movie/${movie.id}`)}
                isInWatchlist={isInWatchlist(movie.id)}
                isWatched={isWatched(movie.id)}
              />
            ))}
          </MovieRow>
        )}
      </div>
    </AppLayout>
  );
}
