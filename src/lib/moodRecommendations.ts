import { Movie, TVShow, discoverMovies, languageCodes, moodToGenres } from '@/lib/tmdb';

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
}

export interface MoodRecommendations {
  popular: Movie[];
  trending: Movie[];
  underrated: Movie[];
  tvSeries: TVShow[];
}

function resolveGenreIds(prefs: MoodPreferences): number[] {
  // Use AI-detected genres first, fallback to mood mapping
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
  // Map mood to TV genres
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

export async function getMoodRecommendations(prefs: MoodPreferences): Promise<MoodRecommendations> {
  const genreIds = resolveGenreIds(prefs);
  const lang = resolveLanguage(prefs);
  const seenIds = new Set<number>();

  const baseParams: Record<string, string> = {
    with_genres: genreIds.join(','),
    'vote_count.gte': '50',
  };
  if (lang) baseParams.with_original_language = lang;

  // Fetch popular, trending, underrated, and TV in parallel
  const [popularRes, trendingRes, underratedRes, tvRes] = await Promise.allSettled([
    // Popular movies
    fetchTMDB<{ results: Movie[] }>('/discover/movie', {
      ...baseParams,
      sort_by: 'popularity.desc',
      page: '1',
    }),
    // Trending movies (uses trending endpoint, then filters by genre client-side)
    fetchTMDB<{ results: Movie[] }>('/trending/movie/week'),
    // Underrated: high rating, low popularity
    fetchTMDB<{ results: Movie[] }>('/discover/movie', {
      ...baseParams,
      sort_by: 'vote_average.desc',
      'vote_count.gte': '200',
      'vote_average.gte': '7.5',
      'popularity.lte': '50',
      page: String(Math.floor(Math.random() * 5) + 1),
    }),
    // TV Series
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

  // Filter trending by matching genres
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
