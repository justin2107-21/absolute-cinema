import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  ArrowLeft, Star, Clock, Calendar, Plus, Check, Share2
} from 'lucide-react';
import { getMovieDetails, getTVDetails, getSimilarMovies, getImageUrl } from '@/lib/tmdb';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieRow } from '@/components/movies/MovieRow';
import { MovieCard } from '@/components/movies/MovieCard';
import { CommentSection } from '@/components/comments/CommentSection';
import { Button } from '@/components/ui/button';
import { RatingModal } from '@/components/rating/RatingModal';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched, getWatchedRating } = useWatchlist();
  const { postActivity } = useFriends();
  const [showRatingModal, setShowRatingModal] = useState(false);

  const isTV = location.pathname.startsWith('/tv/');
  const contentType = isTV ? 'tv' : 'movie';

  const { data: movie, isLoading } = useQuery({
    queryKey: [contentType, id],
    queryFn: () => isTV ? getTVDetails(Number(id)) : getMovieDetails(Number(id)),
    enabled: !!id,
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', contentType, id],
    queryFn: () => getSimilarMovies(Number(id)),
    enabled: !!id && !isTV,
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
          <p className="text-muted-foreground">{isTV ? 'TV Show' : 'Movie'} not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
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
  const userRating = getWatchedRating(movie.id);

  const handleMarkWatched = () => {
    if (!isAuthenticated) {
      toast('Sign In Required', {
        description: 'Sign in to track what you\'ve watched.',
        action: { label: 'Sign In', onClick: () => { window.location.href = '/auth'; } },
      });
      return;
    }
    setShowRatingModal(true);
  };

  const handleRatingSubmit = (rating: number) => {
    setShowRatingModal(false);
    markAsWatched(movie, rating);
    postActivity('rated', movie.title, posterUrl, String(movie.id), 'tmdb', 'movie', rating);
    toast.success(`Rated ${movie.title} ${'⭐'.repeat(rating)}`);
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
    markAsWatched(movie);
    postActivity('watched', movie.title, posterUrl, String(movie.id), 'tmdb', 'movie');
    toast.success(`Marked ${movie.title} as watched`);
  };

  const handleAddToWatchlist = () => {
    addToWatchlist(movie);
    if (isAuthenticated && !inWatchlist) {
      postActivity('watchlist_add', movie.title, posterUrl, String(movie.id), 'tmdb', 'movie');
    }
  };

  return (
    <AppLayout hideNav>
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        onSkip={handleRatingSkip}
        title={movie.title}
        posterUrl={posterUrl}
      />

      <div className="pb-8">
        {/* Hero */}
        <header className="relative min-h-[60vh]">
          <div className="absolute inset-0">
            {backdropUrl && <img src={backdropUrl} alt={movie.title} className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
          <div className="absolute top-4 left-4 z-20">
            <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative z-10 flex flex-col justify-end min-h-[60vh] px-4 pb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
              <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                {posterUrl ? <img src={posterUrl} alt={movie.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h1 className="text-2xl font-bold line-clamp-2">{movie.title}</h1>
                {movie.tagline && <p className="text-sm text-muted-foreground italic">"{movie.tagline}"</p>}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">{movie.vote_average?.toFixed(1)}</span>
                  </div>
                  {movie.runtime > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /><span>{hours}h {minutes}m</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /><span>{releaseYear}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {movie.genres?.slice(0, 3).map((genre) => (
                    <span key={genre.id} className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium">{genre.name}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Actions */}
        <section className="px-4 mt-4 relative z-20">
          <div className="flex gap-3 items-stretch">
            <Button variant={inWatchlist ? "secondary" : "outline"} className="flex-1 gap-2 h-12" onClick={handleAddToWatchlist}>
              {inWatchlist ? (<><Check className="h-4 w-4" /> In Watchlist</>) : (<><Plus className="h-4 w-4" /> Watchlist</>)}
            </Button>
            <Button variant={watched ? "secondary" : "glass"} className="flex-1 gap-2 h-12" onClick={handleMarkWatched}>
              {watched ? (<><Check className="h-4 w-4 text-green-400" /> Watched</>) : (<><Check className="h-4 w-4" /> Watched</>)}
            </Button>
            <Button variant="glass" className="h-12 w-12 flex-shrink-0" onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title: movie.title, url: window.location.href });
                else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
              } catch (e) { console.error(e); }
            }}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* User Rating */}
        {userRating && (
          <section className="px-4 mt-4">
            <div className="glass-card p-3 flex items-center gap-2">
              <span className="text-sm font-medium">Your Rating:</span>
              <span className="text-accent">{'⭐'.repeat(userRating)}</span>
            </div>
          </section>
        )}

        {/* Overview */}
        <section className="px-4 mt-6 space-y-3">
          <h2 className="text-lg font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{movie.overview || 'No overview available.'}</p>
        </section>

        {/* Trailer */}
        {trailer && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Trailer</h2>
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe src={`https://www.youtube.com/embed/${trailer.key}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={trailer.name} />
            </div>
          </section>
        )}

        {/* Similar Movies */}
        {similar && similar.results.length > 0 && (
          <div className="mt-8">
            <MovieRow title="Similar Movies" subtitle="You might also like">
              {similar.results.slice(0, 10).map((m) => (
                <MovieCard key={m.id} movie={m} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched}
                  onClick={() => navigate(`/movie/${m.id}`)} isInWatchlist={isInWatchlist(m.id)} isWatched={isWatched(m.id)} />
              ))}
            </MovieRow>
          </div>
        )}

        {/* Comments */}
        <div className="mt-8">
          <CommentSection contentType="movie" contentId={id || ''} />
        </div>
      </div>
    </AppLayout>
  );
}
