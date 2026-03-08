import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Film, Tv, Sparkles } from 'lucide-react';
import { getMoviesByGenre, getTVShowsByGenre } from '@/lib/tmdb';
import { getAnimeByGenre } from '@/lib/anilist';
import { movieToUnified, tvShowToUnified, anilistToUnified, getContentPath } from '@/lib/unified-content';
import { UnifiedCard } from '@/components/content/UnifiedCard';
import { MovieRowSkeleton } from '@/components/movies/MovieSkeleton';
import { Button } from '@/components/ui/button';

// Map TMDB genre names to AniList genre names (they differ slightly)
const tmdbToAnilistGenre: Record<string, string> = {
  'Action': 'Action',
  'Animation': 'Action', // AniList doesn't have "Animation" - anime is inherently animated
  'Comedy': 'Comedy',
  'Crime': 'Thriller',
  'Documentary': 'Slice of Life',
  'Drama': 'Drama',
  'Family': 'Slice of Life',
  'Fantasy': 'Fantasy',
  'History': 'Drama',
  'Horror': 'Horror',
  'Music': 'Music',
  'Mystery': 'Mystery',
  'Romance': 'Romance',
  'Sci-Fi': 'Sci-Fi',
  'Thriller': 'Thriller',
  'War': 'Action',
  'Western': 'Action',
};

interface CategoryResultsProps {
  genreId: number;
  genreName: string;
  onBack: () => void;
}

export function CategoryResults({ genreId, genreName, onBack }: CategoryResultsProps) {
  const navigate = useNavigate();

  const { data: movies, isLoading: moviesLoading } = useQuery({
    queryKey: ['category-movies', genreId],
    queryFn: () => getMoviesByGenre(genreId),
    staleTime: 1000 * 60 * 5,
  });

  const { data: tvShows, isLoading: tvLoading } = useQuery({
    queryKey: ['category-tv', genreId],
    queryFn: () => getTVShowsByGenre(genreId),
    staleTime: 1000 * 60 * 5,
  });

  const anilistGenre = tmdbToAnilistGenre[genreName] || genreName;
  const { data: anime, isLoading: animeLoading } = useQuery({
    queryKey: ['category-anime', anilistGenre],
    queryFn: () => getAnimeByGenre(anilistGenre),
    staleTime: 1000 * 60 * 5,
  });

  const moviesUnified = movies?.results?.slice(0, 20).map(movieToUnified) || [];
  const tvUnified = tvShows?.results?.slice(0, 20).map(tvShowToUnified) || [];
  const animeUnified = anime?.slice(0, 20).map(anilistToUnified) || [];

  const isLoading = moviesLoading && tvLoading && animeLoading;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="px-4 pt-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{genreName}</h1>
          <p className="text-sm text-muted-foreground">Movies, TV Shows & Anime</p>
        </div>
      </div>

      {isLoading ? (
        <>
          <MovieRowSkeleton />
          <MovieRowSkeleton />
          <MovieRowSkeleton />
        </>
      ) : (
        <>
          {/* Movies Section */}
          {moviesUnified.length > 0 && (
            <section className="space-y-3">
              <div className="px-4 flex items-center gap-2">
                <Film className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{genreName} Movies</h2>
                <span className="text-xs text-muted-foreground">({moviesUnified.length})</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4">
                {moviesUnified.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <UnifiedCard content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* TV Shows Section */}
          {tvUnified.length > 0 && (
            <section className="space-y-3">
              <div className="px-4 flex items-center gap-2">
                <Tv className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{genreName} TV Shows</h2>
                <span className="text-xs text-muted-foreground">({tvUnified.length})</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4">
                {tvUnified.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <UnifiedCard content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Anime Section */}
          {animeUnified.length > 0 && (
            <section className="space-y-3">
              <div className="px-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{genreName} Anime</h2>
                <span className="text-xs text-muted-foreground">({animeUnified.length})</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 px-4">
                {animeUnified.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <UnifiedCard content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {moviesUnified.length === 0 && tvUnified.length === 0 && animeUnified.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No content found for {genreName}
            </div>
          )}
        </>
      )}
    </div>
  );
}
