import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, TrendingUp, Film, Tv, Play } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { MovieGrid } from '@/components/movies/MovieGrid';
import { UnifiedCard } from '@/components/content/UnifiedCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchFilters, type Filter } from '@/components/search/SearchFilters';
import { searchMovies, getPopularMovies, getTrendingMovies, getTopRatedMovies, getMoviesByGenre, searchMulti, type MultiSearchResult, type Movie } from '@/lib/tmdb';
import { searchAnime } from '@/lib/anilist';
import { anilistToUnified, getContentPath } from '@/lib/unified-content';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/contexts/SearchContext';
import { cn } from '@/lib/utils';

type ContentTypeFilter = 'all' | 'movies' | 'tv' | 'anime';

function multiToMovie(r: MultiSearchResult): Movie {
  return {
    id: r.id,
    title: r.title || r.name || '',
    overview: r.overview || '',
    poster_path: r.poster_path,
    backdrop_path: r.backdrop_path,
    release_date: r.release_date || r.first_air_date || '',
    vote_average: r.vote_average,
    vote_count: r.vote_count,
    genre_ids: r.genre_ids || [],
    popularity: r.popularity,
  };
}

export default function Search() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, selectedFilter, setSelectedFilter } = useSearch();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');

  // TMDB multi-search (movies + TV)
  const { data: multiResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-multi', searchQuery],
    queryFn: () => searchMulti(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  // AniList search
  const { data: animeResults, isLoading: isSearchingAnime } = useQuery({
    queryKey: ['search-anime', searchQuery],
    queryFn: () => searchAnime(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // Filter out animation (genre 16) from TMDB results to avoid duplicates with AniList anime
  const ANIMATION_GENRE_ID = 16;
  const movieResults = multiResults?.results
    ?.filter(r => r.media_type === 'movie' && !(r.genre_ids || []).includes(ANIMATION_GENRE_ID))
    .map(multiToMovie) || [];
  const tvResults = multiResults?.results
    ?.filter(r => r.media_type === 'tv' && !(r.genre_ids || []).includes(ANIMATION_GENRE_ID))
    .map(multiToMovie) || [];
  const animeUnified = animeResults?.map(anilistToUnified) || [];

  // Filter-based results (no search)
  const { data: filterResults, isLoading: isFilterLoading } = useQuery({
    queryKey: ['filter', selectedFilter],
    queryFn: async () => {
      if (!selectedFilter) return null;
      const filterConfigs: Record<string, { type: string; value: string | number }> = {
        'trending': { type: 'category', value: 'trending' },
        'top-rated': { type: 'category', value: 'top_rated' },
        'popular': { type: 'category', value: 'popular' },
        'action': { type: 'genre', value: 28 },
        'comedy': { type: 'genre', value: 35 },
        'romance': { type: 'genre', value: 10749 },
        'horror': { type: 'genre', value: 27 },
        'scifi': { type: 'genre', value: 878 },
        'drama': { type: 'genre', value: 18 },
        'animation': { type: 'genre', value: 16 },
        'music': { type: 'genre', value: 10402 },
      };
      const config = filterConfigs[selectedFilter];
      if (!config) return null;
      if (config.type === 'category') {
        if (config.value === 'trending') return getTrendingMovies();
        if (config.value === 'top_rated') return getTopRatedMovies();
        if (config.value === 'popular') return getPopularMovies();
      } else if (config.type === 'genre') {
        return getMoviesByGenre(config.value as number);
      }
      return null;
    },
    enabled: !!selectedFilter && !searchQuery,
  });

  const { data: popular } = useQuery({
    queryKey: ['popular-default'],
    queryFn: () => getPopularMovies(),
    enabled: !selectedFilter && searchQuery.length <= 2,
  });

  const defaultMovies = selectedFilter && filterResults
    ? filterResults.results || []
    : popular?.results || [];

  const isLoading = isSearching || isFilterLoading || isSearchingAnime;
  const isSearchActive = searchQuery.length > 2;

  // Apply content type filter
  const showMovies = contentType === 'all' || contentType === 'movies';
  const showTV = contentType === 'all' || contentType === 'tv';
  const showAnime = contentType === 'all' || contentType === 'anime';

  const filteredMovies = isSearchActive && showMovies ? movieResults : [];
  const filteredTV = isSearchActive && showTV ? tvResults : [];
  const filteredAnime = isSearchActive && showAnime ? animeUnified : [];

  const hasResults = filteredMovies.length > 0 || filteredTV.length > 0 || filteredAnime.length > 0;

  const handleFilterSelect = (filter: Filter | null) => {
    setSelectedFilter(filter?.id || null);
    if (filter) setSearchQuery('');
  };

  const getTitle = () => {
    if (isSearchActive) return `Results for "${searchQuery}"`;
    if (selectedFilter) {
      const filterLabels: Record<string, string> = {
        'trending': 'Trending Movies', 'top-rated': 'Top Rated Movies', 'popular': 'Most Watched',
        'action': 'Action Movies', 'comedy': 'Comedy Movies', 'romance': 'Romance Movies',
        'horror': 'Horror Movies', 'scifi': 'Sci-Fi Movies', 'drama': 'Drama Movies',
        'animation': 'Animation Movies', 'music': 'Musical Movies',
      };
      return filterLabels[selectedFilter] || 'Movies';
    }
    return undefined;
  };

  const contentTypeFilters: { id: ContentTypeFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'movies', label: 'Movies', icon: <Film className="h-3.5 w-3.5" /> },
    { id: 'tv', label: 'TV', icon: <Tv className="h-3.5 w-3.5" /> },
    { id: 'anime', label: 'Anime', icon: <Play className="h-3.5 w-3.5" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        <header className="px-4 space-y-4">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold">
            Search
          </motion.h1>

          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="text" placeholder="Search movies, TV shows, anime..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 pr-10" />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {contentTypeFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setContentType(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  contentType === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <SearchFilters selectedFilter={selectedFilter} onFilterSelect={handleFilterSelect} />
        </header>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isLoading && isSearchActive && hasResults && (
            <>
              {filteredMovies.length > 0 && (
                <MovieGrid title="Movies">
                  {filteredMovies.slice(0, 18).map((movie, index) => (
                    <motion.div key={`movie-${movie.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <MovieCard movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                        onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                    </motion.div>
                  ))}
                </MovieGrid>
              )}

              {filteredTV.length > 0 && (
                <MovieGrid title="TV Shows">
                  {filteredTV.slice(0, 18).map((show, index) => (
                    <motion.div key={`tv-${show.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <MovieCard movie={show} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                        onClick={() => navigate(`/tv/${show.id}`)} isInWatchlist={isInWatchlist(show.id)} isWatched={isWatched(show.id)} />
                    </motion.div>
                  ))}
                </MovieGrid>
              )}

              {filteredAnime.length > 0 && (
                <MovieGrid title="Anime">
                  {filteredAnime.slice(0, 18).map((content, index) => (
                    <motion.div key={content.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <UnifiedCard content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                    </motion.div>
                  ))}
                </MovieGrid>
              )}
            </>
          )}

          {!isLoading && isSearchActive && !hasResults && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-sm text-muted-foreground">Try a different search term or check spelling</p>
            </motion.div>
          )}

          {!isSearchActive && (
            <>
              {defaultMovies.length > 0 && (
                <MovieGrid title={getTitle() || 'Popular Movies'}>
                  {defaultMovies.slice(0, 18).map((movie, index) => (
                    <motion.div key={movie.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <MovieCard movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                        onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                    </motion.div>
                  ))}
                </MovieGrid>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
