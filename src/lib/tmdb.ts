const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'df0c550327ce5a364aac2cb1e2420f9d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
}

export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  name?: string; // For TV shows
  number_of_seasons?: number; // For TV shows
  number_of_episodes?: number; // For TV shows
  first_air_date?: string; // For TV shows
  videos?: {
    results: {
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
    }[];
  };
}

export interface Genre {
  id: number;
  name: string;
}

export const getImageUrl = (path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const searchParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...params,
  });
  
  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  
  return response.json();
};

export const getPopularMovies = async (page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/movie/popular',
    { page: page.toString() }
  );
};

export const getTrendingMovies = async (timeWindow: 'day' | 'week' = 'day') => {
  return fetchTMDB<{ results: Movie[] }>(`/trending/movie/${timeWindow}`);
};

export const getTopRatedMovies = async (page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/movie/top_rated',
    { page: page.toString() }
  );
};

export const getNowPlayingMovies = async (page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/movie/now_playing',
    { page: page.toString() }
  );
};

export const getUpcomingMovies = async (page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/movie/upcoming',
    { page: page.toString() }
  );
};

export const searchMovies = async (query: string, page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/search/movie',
    { query, page: page.toString() }
  );
};

export const getMovieDetails = async (movieId: number) => {
  return fetchTMDB<MovieDetails>(`/movie/${movieId}`, { append_to_response: 'videos' });
};

export const getTVDetails = async (tvId: number) => {
  return fetchTMDB<MovieDetails>(`/tv/${tvId}`, { append_to_response: 'videos' });
};

export const getMoviesByGenre = async (genreId: number, page = 1, sortBy = 'popularity.desc') => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/discover/movie',
    { 
      with_genres: genreId.toString(), 
      page: page.toString(),
      sort_by: sortBy
    }
  );
};

export const getGenres = async () => {
  return fetchTMDB<{ genres: Genre[] }>('/genre/movie/list');
};

export const getSimilarMovies = async (movieId: number) => {
  return fetchTMDB<{ results: Movie[] }>(`/movie/${movieId}/similar`);
};

export const getRecommendedMovies = async (movieId: number) => {
  return fetchTMDB<{ results: Movie[] }>(`/movie/${movieId}/recommendations`);
};

// Discover movies with various filters
export const discoverMovies = async (params: {
  page?: number;
  sortBy?: string;
  withGenres?: number[];
  withOriginalLanguage?: string;
  voteAverageGte?: number;
  voteCountGte?: number;
  releaseDateGte?: string;
  releaseDateLte?: string;
}) => {
  const queryParams: Record<string, string> = {
    page: (params.page || 1).toString(),
    sort_by: params.sortBy || 'popularity.desc',
  };

  if (params.withGenres?.length) {
    queryParams.with_genres = params.withGenres.join(',');
  }
  if (params.withOriginalLanguage) {
    queryParams.with_original_language = params.withOriginalLanguage;
  }
  if (params.voteAverageGte) {
    queryParams['vote_average.gte'] = params.voteAverageGte.toString();
  }
  if (params.voteCountGte) {
    queryParams['vote_count.gte'] = params.voteCountGte.toString();
  }
  if (params.releaseDateGte) {
    queryParams['release_date.gte'] = params.releaseDateGte;
  }
  if (params.releaseDateLte) {
    queryParams['release_date.lte'] = params.releaseDateLte;
  }

  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/discover/movie',
    queryParams
  );
};

// Extended mood-based genre mapping with more variety
export const moodToGenres: Record<string, number[]> = {
  happy: [35, 10751, 16], // Comedy, Family, Animation
  sad: [18, 10749], // Drama, Romance
  stressed: [35, 16, 10751], // Comedy, Animation, Family
  romantic: [10749, 35], // Romance, Comedy
  excited: [28, 12, 878], // Action, Adventure, Sci-Fi
  relaxed: [99, 10751, 16], // Documentary, Family, Animation
  lonely: [18, 10749, 10751], // Drama, Romance, Family
  anxious: [35, 16, 10402], // Comedy, Animation, Music
  burned_out: [16, 10751, 14], // Animation, Family, Fantasy
  overwhelmed: [16, 35, 10751], // Animation, Comedy, Family
  nostalgic: [10751, 16, 12], // Family, Animation, Adventure
  heartbroken: [18, 10749, 10402], // Drama, Romance, Music
  motivated: [28, 12, 36], // Action, Adventure, History
  bored: [53, 9648, 878], // Thriller, Mystery, Sci-Fi
  hopeful: [18, 10751, 14], // Drama, Family, Fantasy
  curious: [99, 878, 9648], // Documentary, Sci-Fi, Mystery
};

// Language codes for filtering
export const languageCodes: Record<string, string> = {
  filipino: 'tl',
  korean: 'ko',
  japanese: 'ja',
  hindi: 'hi',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  chinese: 'zh',
  thai: 'th',
};

export const getMoviesByMood = async (mood: string, page = 1, language?: string) => {
  const genreIds = moodToGenres[mood.toLowerCase()] || [35];
  
  const params: Record<string, string> = {
    with_genres: genreIds.join(','), 
    page: page.toString(),
    sort_by: 'popularity.desc',
    'vote_count.gte': '100',
  };

  if (language && languageCodes[language.toLowerCase()]) {
    params.with_original_language = languageCodes[language.toLowerCase()];
  }

  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/discover/movie',
    params
  );
};

// Helper to deduplicate movies across lists
export const deduplicateMovies = (movies: Movie[], existingIds: Set<number>): Movie[] => {
  return movies.filter(movie => {
    if (existingIds.has(movie.id)) return false;
    existingIds.add(movie.id);
    return true;
  });
};

// Get diversified home page content
export const getDiversifiedHomeContent = async () => {
  const seenIds = new Set<number>();
  
  // Fetch from different endpoints with different pages for variety
  const [trending, popular, topRated, nowPlaying, upcoming] = await Promise.all([
    getTrendingMovies('day'),
    getPopularMovies(2), // Page 2 for different results
    getTopRatedMovies(1),
    getNowPlayingMovies(1),
    getUpcomingMovies(1),
  ]);

  return {
    trending: deduplicateMovies(trending.results, seenIds).slice(0, 10),
    popular: deduplicateMovies(popular.results, seenIds).slice(0, 10),
    topRated: deduplicateMovies(topRated.results, seenIds).slice(0, 10),
    nowPlaying: deduplicateMovies(nowPlaying.results, seenIds).slice(0, 10),
    upcoming: deduplicateMovies(upcoming.results, seenIds).slice(0, 10),
  };
};

// TV Show interface
export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
}

// TV Show API functions
export const getTrendingTV = async (timeWindow: 'day' | 'week' = 'day') => {
  return fetchTMDB<{ results: TVShow[] }>(`/trending/tv/${timeWindow}`);
};

export const getPopularTV = async (page = 1) => {
  return fetchTMDB<{ results: TVShow[]; page: number; total_pages: number }>(
    '/tv/popular',
    { page: page.toString() }
  );
};

export const getTopRatedTV = async (page = 1) => {
  return fetchTMDB<{ results: TVShow[]; page: number; total_pages: number }>(
    '/tv/top_rated',
    { page: page.toString() }
  );
};

export const getAiringTodayTV = async (page = 1) => {
  return fetchTMDB<{ results: TVShow[]; page: number; total_pages: number }>(
    '/tv/airing_today',
    { page: page.toString() }
  );
};

export const getOnTheAirTV = async (page = 1) => {
  return fetchTMDB<{ results: TVShow[]; page: number; total_pages: number }>(
    '/tv/on_the_air',
    { page: page.toString() }
  );
};

export const getTVShowsByGenre = async (genreId: number, page = 1, sortBy = 'popularity.desc') => {
  return fetchTMDB<{ results: TVShow[]; page: number; total_pages: number }>(
    '/discover/tv',
    {
      with_genres: genreId.toString(),
      page: page.toString(),
      sort_by: sortBy,
    }
  );
};

// Multi-search (movies + TV + people in one call)
export interface MultiSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
}

export const searchMulti = async (query: string, page = 1) => {
  return fetchTMDB<{ results: MultiSearchResult[] }>(
    '/search/multi',
    { query, page: page.toString() }
  );
};

// Helper to deduplicate TV shows
const deduplicateTV = (shows: TVShow[], existingIds: Set<number>): TVShow[] => {
  return shows.filter(show => {
    if (existingIds.has(show.id)) return false;
    existingIds.add(show.id);
    return true;
  });
};

// Get diversified TV content
export const getTVContent = async () => {
  const seenIds = new Set<number>();
  
  const [trending, popular, topRated, airingToday, onTheAir] = await Promise.all([
    getTrendingTV('day'),
    getPopularTV(1),
    getTopRatedTV(1),
    getAiringTodayTV(1),
    getOnTheAirTV(1),
  ]);

  return {
    trending: deduplicateTV(trending.results, seenIds).slice(0, 10),
    popular: deduplicateTV(popular.results, seenIds).slice(0, 10),
    topRated: deduplicateTV(topRated.results, seenIds).slice(0, 10),
    airingToday: deduplicateTV(airingToday.results, seenIds).slice(0, 10),
    onTheAir: deduplicateTV(onTheAir.results, seenIds).slice(0, 10),
  };
};