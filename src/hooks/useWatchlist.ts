import { useState, useCallback, useEffect } from 'react';
import { Movie, getImageUrl } from '@/lib/tmdb';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const WATCHLIST_KEY = 'absolutecinema_watchlist_v2';
const WATCHED_KEY = 'absolutecinema_watched_v2';

export interface WatchlistItem {
  id: string;
  source: 'tmdb' | 'anilist';
  mediaType: 'movie' | 'tv' | 'anime';
  sourceId: number;
  title: string;
  posterUrl: string | null;
  releaseDate?: string;
  voteAverage?: number;
}

export interface WatchedItem extends WatchlistItem {
  watchedAt: string;
  rating?: number;
  review?: string;
}

export function movieToWatchlistItem(movie: Movie, mediaType: 'movie' | 'tv' = 'movie'): WatchlistItem {
  return {
    id: `tmdb-${mediaType}-${movie.id}`,
    source: 'tmdb',
    mediaType,
    sourceId: movie.id,
    title: movie.title || (movie as any).name || '',
    posterUrl: getImageUrl(movie.poster_path, 'w500'),
    releaseDate: movie.release_date || (movie as any).first_air_date,
    voteAverage: movie.vote_average,
  };
}

export function getWatchlistItemPath(item: WatchlistItem): string {
  if (item.source === 'anilist') return `/anime/${item.sourceId}`;
  if (item.mediaType === 'tv') return `/tv/${item.sourceId}`;
  return `/movie/${item.sourceId}`;
}

function isWatchlistItem(input: any): input is WatchlistItem {
  return input && typeof input.source === 'string' && typeof input.mediaType === 'string' && typeof input.id === 'string';
}

export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watched, setWatched] = useState<WatchedItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      const savedWatched = localStorage.getItem(WATCHED_KEY);
      if (saved) setWatchlist(JSON.parse(saved));
      if (savedWatched) setWatched(JSON.parse(savedWatched));
    } catch { /* ignore corrupt data */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
  }, [watched]);

  const requireAuth = useCallback((): boolean => {
    if (!isAuthenticated) {
      toast('Sign In Required', {
        description: 'You need to sign in to add titles to your watchlist and track what you\'ve watched.',
        action: { label: 'Sign In', onClick: () => { window.location.href = '/auth'; } },
      });
      return false;
    }
    return true;
  }, [isAuthenticated]);

  const addToWatchlist = useCallback((input: Movie | WatchlistItem) => {
    if (!requireAuth()) return;
    const item = isWatchlistItem(input) ? input : movieToWatchlistItem(input);
    setWatchlist(prev => {
      if (prev.some(m => m.id === item.id)) {
        return prev.filter(m => m.id !== item.id);
      }
      return [...prev, item];
    });
  }, [requireAuth]);

  const removeFromWatchlist = useCallback((id: string | number) => {
    const stringId = typeof id === 'number' ? `tmdb-movie-${id}` : id;
    setWatchlist(prev => prev.filter(m => m.id !== stringId));
  }, []);

  const markAsWatched = useCallback((input: Movie | WatchlistItem, rating?: number, review?: string) => {
    if (!requireAuth()) return;
    const item = isWatchlistItem(input) ? input : movieToWatchlistItem(input);
    const watchedItem: WatchedItem = { ...item, watchedAt: new Date().toISOString(), rating, review };
    setWatched(prev => {
      const existing = prev.findIndex(m => m.id === item.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = watchedItem;
        return updated;
      }
      return [watchedItem, ...prev];
    });
    removeFromWatchlist(item.id);
  }, [requireAuth, removeFromWatchlist]);

  const removeFromWatched = useCallback((id: string | number) => {
    const stringId = typeof id === 'number' ? `tmdb-movie-${id}` : id;
    setWatched(prev => prev.filter(m => m.id !== stringId));
  }, []);

  const isInWatchlist = useCallback((id: string | number) => {
    const stringId = typeof id === 'number' ? `tmdb-movie-${id}` : id;
    return watchlist.some(m => m.id === stringId);
  }, [watchlist]);

  const isWatched = useCallback((id: string | number) => {
    const stringId = typeof id === 'number' ? `tmdb-movie-${id}` : id;
    return watched.some(m => m.id === stringId);
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
