import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Calendar,
  Plus,
  Check,
  Play,
  Share2
} from 'lucide-react';
import { getMovieDetails, getSimilarMovies, getImageUrl } from '@/lib/tmdb';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieCard } from '@/components/movies/MovieCard';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovieDetails(Number(id)),
    enabled: !!id,
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => getSimilarMovies(Number(id)),
    enabled: !!id,
  });

  const trailer = movie?.videos?.results.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  );

  if (isLoading) {
    return (
      <AppLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!movie) {
    return (
      <AppLayout hideNav>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Movie not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const backdropUrl = getImageUrl(movie.backdrop_path, 'original');
  const posterUrl = getImageUrl(movie.poster_path, 'w500');
  const releaseYear = movie.release_date?.split('-')[0];
  const hours = Math.floor((movie.runtime || 0) / 60);
  const minutes = (movie.runtime || 0) % 60;

  const inWatchlist = isInWatchlist(movie.id);
  const watched = isWatched(movie.id);

  return (
    <AppLayout hideNav>
      <div className="pb-8">
        {/* Hero */}
        <header className="relative min-h-[60vh]">
          {/* Background */}
          <div className="absolute inset-0">
            {backdropUrl && (
              <img
                src={backdropUrl}
                alt={movie.title}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          {/* Back button */}
          <div className="absolute top-4 left-4 z-20">
            <Button
              variant="glass"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-end min-h-[60vh] px-4 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              {/* Poster */}
              <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-secondary" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <h1 className="text-2xl font-bold line-clamp-2">{movie.title}</h1>
                
                {movie.tagline && (
                  <p className="text-sm text-muted-foreground italic">
                    "{movie.tagline}"
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">
                      {movie.vote_average?.toFixed(1)}
                    </span>
                  </div>
                  {movie.runtime > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{hours}h {minutes}m</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{releaseYear}</span>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {movie.genres?.slice(0, 3).map((genre) => (
                    <span
                      key={genre.id}
                      className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Actions */}
        <section className="px-4 -mt-2 relative z-20">
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant={inWatchlist ? "secondary" : "default"}
              onClick={() => addToWatchlist(movie)}
            >
              {inWatchlist ? (
                <>
                  <Check className="h-4 w-4" />
                  In Watchlist
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to Watchlist
                </>
              )}
            </Button>
            <Button
              variant="glass"
              size="icon"
              onClick={() => markAsWatched(movie)}
            >
              {watched ? (
                <Check className="h-4 w-4 text-cinema-green" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button variant="glass" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Overview */}
        <section className="px-4 mt-6 space-y-3">
          <h2 className="text-lg font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {movie.overview || 'No overview available.'}
          </p>
        </section>

        {/* Trailer */}
        {trailer && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Trailer</h2>
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={trailer.name}
              />
            </div>
          </section>
        )}

        {/* Similar Movies */}
        {similar && similar.results.length > 0 && (
          <div className="mt-8">
            <MovieRow title="Similar Movies" subtitle="You might also like">
              {similar.results.slice(0, 10).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  size="sm"
                  onAddToWatchlist={addToWatchlist}
                  onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  isInWatchlist={isInWatchlist(movie.id)}
                  isWatched={isWatched(movie.id)}
                />
              ))}
            </MovieRow>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
