import { Movie, TVShow, discoverMovies, languageCodes, moodToGenres, searchMovies, getSimilarMovies, getRecommendedMovies, searchMulti, type MultiSearchResult } from '@/lib/tmdb';
import { searchAnime, type AniListMedia } from '@/lib/anilist';

// Genre name to TMDB ID mapping
const genreNameToId: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749, 'sci-fi': 878,
  science_fiction: 878, thriller: 53, war: 10752, western: 37,
};

const tvGenreNameToId: Record<string, number> = {
  action: 10759, adventure: 10759, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 10765, 'sci-fi': 10765,
  mystery: 9648, romance: 10749, thriller: 53, war: 10768, western: 37,
};

export interface MoodPreferences {
  primary_emotion: string;
  secondary_emotion: string;
  intent: string;
  genres: string[];
  language: string;
  tone: string;
  popularity_preference: string;
  content_type: string;
  keywords: string[];
  specific_titles?: string[];
  similar_to?: string;
}

export interface MoodRecommendations {
  popular: Movie[];
  trending: Movie[];
  underrated: Movie[];
  tvSeries: TVShow[];
  anime?: AniListMedia[];
}

function resolveGenreIds(prefs: MoodPreferences): number[] {
  const fromAI = prefs.genres
    .map((g) => genreNameToId[g.toLowerCase()] || genreNameToId[g.toLowerCase().replace(' ', '_')])
    .filter(Boolean);

  if (fromAI.length > 0) return fromAI;
  return moodToGenres[prefs.primary_emotion] || [35];
}

function resolveTVGenreIds(prefs: MoodPreferences): number[] {
  const fromAI = prefs.genres
    .map((g) => tvGenreNameToId[g.toLowerCase()] || tvGenreNameToId[g.toLowerCase().replace(' ', '_')])
    .filter(Boolean);

  if (fromAI.length > 0) return fromAI;
  const movieGenres = moodToGenres[prefs.primary_emotion] || [35];
  return movieGenres;
}

function resolveLanguage(prefs: MoodPreferences): string | undefined {
  if (!prefs.language) return undefined;
  return languageCodes[prefs.language.toLowerCase()] || undefined;
}

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'df0c550327ce5a364aac2cb1e2420f9d';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const sp = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const res = await fetch(`${TMDB_BASE}${endpoint}?${sp}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

// Search for specific titles on TMDB and return matched movies/TV
async function searchSpecificTitles(titles: string[], contentType: string): Promise<{ movies: Movie[], tvShows: TVShow[], anime: AniListMedia[] }> {
  const movies: Movie[] = [];
  const tvShows: TVShow[] = [];
  const anime: AniListMedia[] = [];
  const seenIds = new Set<number>();

  const isAnimeContent = contentType === 'anime';

  // Search all titles in parallel
  const searchPromises = titles.map(async (title) => {
    try {
      if (isAnimeContent) {
        // Search AniList for anime
        const results = await searchAnime(title);
        if (results && results.length > 0) {
          const match = results[0];
          if (!seenIds.has(match.id)) {
            seenIds.add(match.id);
            anime.push(match);
          }
        }
      } else {
        // Search TMDB multi
        const results = await searchMulti(title);
        if (results?.results) {
          for (const r of results.results.slice(0, 2)) {
            if (seenIds.has(r.id)) continue;
            seenIds.add(r.id);
            if (r.media_type === 'movie') {
              movies.push({
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
              });
            } else if (r.media_type === 'tv') {
              tvShows.push({
                id: r.id,
                name: r.name || r.title || '',
                overview: r.overview || '',
                poster_path: r.poster_path,
                backdrop_path: r.backdrop_path,
                first_air_date: r.first_air_date || r.release_date || '',
                vote_average: r.vote_average,
                vote_count: r.vote_count,
                genre_ids: r.genre_ids || [],
                popularity: r.popularity,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Failed to search for title "${title}":`, e);
    }
  });

  await Promise.allSettled(searchPromises);
  return { movies, tvShows, anime };
}

// Get similar content from TMDB using the similar/recommendations endpoints
async function getSimilarContent(title: string, contentType: string): Promise<{ movies: Movie[], tvShows: TVShow[], anime: AniListMedia[] }> {
  const movies: Movie[] = [];
  const tvShows: TVShow[] = [];
  const anime: AniListMedia[] = [];

  try {
    if (contentType === 'anime') {
      // For anime, search AniList for the title first, then get recommendations
      const results = await searchAnime(title);
      // Return related anime from AniList search results (skip first which is the source)
      if (results && results.length > 1) {
        anime.push(...results.slice(1, 13));
      }
    } else {
      // Search TMDB for the title first
      const searchResults = await searchMulti(title);
      const match = searchResults?.results?.find(r => r.media_type === 'movie' || r.media_type === 'tv');
      if (match) {
        if (match.media_type === 'movie') {
          const [similar, recommended] = await Promise.allSettled([
            getSimilarMovies(match.id),
            getRecommendedMovies(match.id),
          ]);
          if (similar.status === 'fulfilled') movies.push(...similar.value.results.slice(0, 8));
          if (recommended.status === 'fulfilled') {
            const seenIds = new Set(movies.map(m => m.id));
            const newRecs = recommended.value.results.filter(m => !seenIds.has(m.id));
            movies.push(...newRecs.slice(0, 6));
          }
        } else if (match.media_type === 'tv') {
          // Get similar TV shows
          const similar = await fetchTMDB<{ results: TVShow[] }>(`/tv/${match.id}/similar`);
          if (similar?.results) tvShows.push(...similar.results.slice(0, 12));
        }
      }
    }
  } catch (e) {
    console.error(`Failed to get similar content for "${title}":`, e);
  }

  return { movies, tvShows, anime };
}

export async function getMoodRecommendations(prefs: MoodPreferences): Promise<MoodRecommendations> {
  const hasSpecificTitles = prefs.specific_titles && prefs.specific_titles.length > 0;
  const hasSimilarTo = prefs.similar_to && prefs.similar_to.trim().length > 0;

  // If AI provided specific titles, search for those instead of generic genre discover
  if (hasSpecificTitles) {
    const { movies, tvShows, anime } = await searchSpecificTitles(prefs.specific_titles!, prefs.content_type);
    
    // Also get similar content if similar_to is specified
    let extraMovies: Movie[] = [];
    let extraTV: TVShow[] = [];
    let extraAnime: AniListMedia[] = [];
    if (hasSimilarTo) {
      const similar = await getSimilarContent(prefs.similar_to!, prefs.content_type);
      extraMovies = similar.movies;
      extraTV = similar.tvShows;
      extraAnime = similar.anime;
    }

    // Combine, deduplicating
    const seenMovieIds = new Set(movies.map(m => m.id));
    const seenTVIds = new Set(tvShows.map(t => t.id));
    const seenAnimeIds = new Set(anime.map(a => a.id));
    
    for (const m of extraMovies) {
      if (!seenMovieIds.has(m.id)) { movies.push(m); seenMovieIds.add(m.id); }
    }
    for (const t of extraTV) {
      if (!seenTVIds.has(t.id)) { tvShows.push(t); seenTVIds.add(t.id); }
    }
    for (const a of extraAnime) {
      if (!seenAnimeIds.has(a.id)) { anime.push(a); seenAnimeIds.add(a.id); }
    }

    return {
      popular: movies,
      trending: [],
      underrated: [],
      tvSeries: tvShows,
      anime: anime.length > 0 ? anime : undefined,
    };
  }

  // If similar_to but no specific titles, use TMDB similar/recommendations
  if (hasSimilarTo) {
    const { movies, tvShows, anime } = await getSimilarContent(prefs.similar_to!, prefs.content_type);
    return {
      popular: movies,
      trending: [],
      underrated: [],
      tvSeries: tvShows,
      anime: anime.length > 0 ? anime : undefined,
    };
  }

  // Default: genre-based discover (original logic)
  const genreIds = resolveGenreIds(prefs);
  const lang = resolveLanguage(prefs);
  const seenIds = new Set<number>();

  const baseParams: Record<string, string> = {
    with_genres: genreIds.join(','),
    'vote_count.gte': '50',
  };
  if (lang) baseParams.with_original_language = lang;

  const [popularRes, trendingRes, underratedRes, tvRes] = await Promise.allSettled([
    fetchTMDB<{ results: Movie[] }>('/discover/movie', {
      ...baseParams,
      sort_by: 'popularity.desc',
      page: '1',
    }),
    fetchTMDB<{ results: Movie[] }>('/trending/movie/week'),
    fetchTMDB<{ results: Movie[] }>('/discover/movie', {
      ...baseParams,
      sort_by: 'vote_average.desc',
      'vote_count.gte': '200',
      'vote_average.gte': '7.5',
      'popularity.lte': '50',
      page: String(Math.floor(Math.random() * 5) + 1),
    }),
    fetchTMDB<{ results: TVShow[] }>('/discover/tv', {
      with_genres: resolveTVGenreIds(prefs).join(','),
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
      page: '1',
      ...(lang ? { with_original_language: lang } : {}),
    }),
  ]);

  const dedupe = (movies: Movie[]) =>
    movies.filter((m) => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

  const popular = popularRes.status === 'fulfilled' ? dedupe(popularRes.value.results).slice(0, 12) : [];

  let trending: Movie[] = [];
  if (trendingRes.status === 'fulfilled') {
    const genreSet = new Set(genreIds);
    const filtered = trendingRes.value.results.filter(
      (m) => m.genre_ids?.some((g) => genreSet.has(g))
    );
    trending = dedupe(filtered.length > 0 ? filtered : trendingRes.value.results).slice(0, 12);
  }

  const underrated = underratedRes.status === 'fulfilled' ? dedupe(underratedRes.value.results).slice(0, 12) : [];
  const tvSeries: TVShow[] = tvRes.status === 'fulfilled' ? tvRes.value.results.slice(0, 12) : [];

  return { popular, trending, underrated, tvSeries };
}