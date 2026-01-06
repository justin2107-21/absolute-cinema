import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieGrid } from '@/components/movies/MovieGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchMovies, getPopularMovies } from '@/lib/tmdb';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();

  // Debounce search
  const handleSearch = (value: string) => {
    setQuery(value);
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const { data: popular } = useQuery({
    queryKey: ['popular'],
    queryFn: () => getPopularMovies(),
  });

  const movies = debouncedQuery.length > 2 ? searchResults?.results : popular?.results;

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        {/* Header */}
        <header className="px-4 space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            Search Movies
          </motion.h1>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* Results */}
        <div className="space-y-4">
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isSearching && movies && movies.length > 0 && (
            <MovieGrid
              title={debouncedQuery.length > 2 ? `Results for "${debouncedQuery}"` : undefined}
            >
              {movies.slice(0, 18).map((movie, index) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MovieCard
                    movie={movie}
                    size="sm"
                    onAddToWatchlist={addToWatchlist}
                    onMarkWatched={markAsWatched}
                    onClick={() => navigate(`/movie/${movie.id}`)}
                    isInWatchlist={isInWatchlist(movie.id)}
                    isWatched={isWatched(movie.id)}
                  />
                </motion.div>
              ))}
            </MovieGrid>
          )}

          {!isSearching && debouncedQuery.length > 2 && searchResults?.results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No movies found</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </motion.div>
          )}

          {/* Popular section when not searching */}
          {debouncedQuery.length <= 2 && (
            <div className="px-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Popular Movies</h2>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
