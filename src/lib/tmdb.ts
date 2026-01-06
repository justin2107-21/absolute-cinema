const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
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

export const getTrendingMovies = async (timeWindow: 'day' | 'week' = 'week') => {
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

export const getMoviesByGenre = async (genreId: number, page = 1) => {
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/discover/movie',
    { with_genres: genreId.toString(), page: page.toString() }
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

// Mood-based genre mapping
export const moodToGenres: Record<string, number[]> = {
  happy: [35, 10751, 16], // Comedy, Family, Animation
  sad: [18, 10749], // Drama, Romance
  stressed: [35, 16, 10751], // Comedy, Animation, Family
  romantic: [10749, 35], // Romance, Comedy
  excited: [28, 12, 878], // Action, Adventure, Sci-Fi
  relaxed: [99, 10751, 16], // Documentary, Family, Animation
};

export const getMoviesByMood = async (mood: string, page = 1) => {
  const genreIds = moodToGenres[mood.toLowerCase()] || [35];
  return fetchTMDB<{ results: Movie[]; page: number; total_pages: number }>(
    '/discover/movie',
    { 
      with_genres: genreIds.join(','), 
      page: page.toString(),
      sort_by: 'popularity.desc'
    }
  );
};
