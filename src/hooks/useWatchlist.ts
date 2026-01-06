import { useState, useCallback, useEffect } from 'react';
import { Movie } from '@/lib/tmdb';

const WATCHLIST_KEY = 'cinemasync_watchlist';
const WATCHED_KEY = 'cinemasync_watched';

export interface WatchedMovie extends Movie {
  watchedAt: string;
  rating?: number;
  review?: string;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<WatchedMovie[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedWatchlist = localStorage.getItem(WATCHLIST_KEY);
    const savedWatched = localStorage.getItem(WATCHED_KEY);
    
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    }
    if (savedWatched) {
      setWatched(JSON.parse(savedWatched));
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
  }, [watched]);

  const addToWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id)) {
        return prev.filter((m) => m.id !== movie.id);
      }
      return [...prev, movie];
    });
  }, []);

  const removeFromWatchlist = useCallback((movieId: number) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
  }, []);

  const markAsWatched = useCallback((movie: Movie, rating?: number, review?: string) => {
    const watchedMovie: WatchedMovie = {
      ...movie,
      watchedAt: new Date().toISOString(),
      rating,
      review,
    };
    
    setWatched((prev) => {
      const existing = prev.findIndex((m) => m.id === movie.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = watchedMovie;
        return updated;
      }
      return [watchedMovie, ...prev];
    });
    
    // Remove from watchlist if present
    removeFromWatchlist(movie.id);
  }, [removeFromWatchlist]);

  const removeFromWatched = useCallback((movieId: number) => {
    setWatched((prev) => prev.filter((m) => m.id !== movieId));
  }, []);

  const isInWatchlist = useCallback((movieId: number) => {
    return watchlist.some((m) => m.id === movieId);
  }, [watchlist]);

  const isWatched = useCallback((movieId: number) => {
    return watched.some((m) => m.id === movieId);
  }, [watched]);

  return {
    watchlist,
    watched,
    addToWatchlist,
    removeFromWatchlist,
    markAsWatched,
    removeFromWatched,
    isInWatchlist,
    isWatched,
  };
}
