// Unified Content Model - normalizes TMDB and AniList data into a single type
import { Movie, TVShow, getImageUrl } from '@/lib/tmdb';
import type { AniListMedia } from '@/lib/anilist';

export interface UnifiedContent {
  id: string;
  source: 'tmdb' | 'anilist';
  title: string;
  type: 'movie' | 'tv' | 'anime';
  description: string;
  poster: string | null;
  backdrop: string | null;
  releaseDate: string;
  rating: number;
  genres: string[];
  trailer?: string;
  // Source-specific extras
  episodes?: number | null;
  chapters?: number | null;
  status?: string;
  season?: string | null;
  seasonYear?: number | null;
  studio?: string;
  format?: string;
  runtime?: number;
  sourceId: number; // original numeric ID from source
}

// Genre ID to name mapping for TMDB
const tmdbGenreMap: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

export function movieToUnified(movie: Movie): UnifiedContent {
  return {
    id: `tmdb-movie-${movie.id}`,
    source: 'tmdb',
    title: movie.title,
    type: 'movie',
    description: movie.overview || '',
    poster: getImageUrl(movie.poster_path, 'w500'),
    backdrop: getImageUrl(movie.backdrop_path, 'original'),
    releaseDate: movie.release_date || '',
    rating: movie.vote_average || 0,
    genres: (movie.genre_ids || []).map(id => tmdbGenreMap[id] || 'Unknown').filter(g => g !== 'Unknown'),
    sourceId: movie.id,
  };
}

export function tvShowToUnified(show: TVShow): UnifiedContent {
  return {
    id: `tmdb-tv-${show.id}`,
    source: 'tmdb',
    title: show.name,
    type: 'tv',
    description: show.overview || '',
    poster: getImageUrl(show.poster_path, 'w500'),
    backdrop: getImageUrl(show.backdrop_path, 'original'),
    releaseDate: show.first_air_date || '',
    rating: show.vote_average || 0,
    genres: (show.genre_ids || []).map(id => tmdbGenreMap[id] || 'Unknown').filter(g => g !== 'Unknown'),
    sourceId: show.id,
  };
}

export function anilistToUnified(media: AniListMedia): UnifiedContent {
  const title = media.title.english || media.title.romaji || media.title.native;
  const releaseDate = media.seasonYear ? `${media.seasonYear}-01-01` : '';
  
  return {
    id: `anilist-${media.type.toLowerCase()}-${media.id}`,
    source: 'anilist',
    title,
    type: 'anime',
    description: media.description?.replace(/<[^>]*>/g, '') || '',
    poster: media.coverImage.large,
    backdrop: media.bannerImage,
    releaseDate,
    rating: media.averageScore ? media.averageScore / 10 : 0,
    genres: media.genres || [],
    episodes: media.episodes,
    chapters: media.chapters,
    status: media.status,
    season: media.season,
    seasonYear: media.seasonYear,
    format: media.type,
    sourceId: media.id,
  };
}

// Parse a unified content ID back to source + numeric ID
export function parseUnifiedId(unifiedId: string): { source: 'tmdb' | 'anilist'; type: string; id: number } {
  const parts = unifiedId.split('-');
  const source = parts[0] as 'tmdb' | 'anilist';
  const type = parts[1];
  const id = parseInt(parts.slice(2).join('-'), 10);
  return { source, type, id };
}

// Get the navigation path for a unified content item
export function getContentPath(content: UnifiedContent): string {
  if (content.source === 'tmdb') {
    if (content.type === 'tv') return `/tv/${content.sourceId}`;
    return `/movie/${content.sourceId}`;
  }
  return `/anime/${content.sourceId}`;
}
