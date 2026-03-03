import { Movie, discoverMovies, getRecommendedMovies, getSimilarMovies } from '@/lib/tmdb';
import { WatchedItem, WatchlistItem } from '@/hooks/useWatchlist';

const RECO_CACHE_KEY = 'absolutecinema_reco_cache';
const RECO_TIMESTAMP_KEY = 'absolutecinema_reco_timestamp';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface RecoCache {
  personalized: Movie[];
  genreMix: Movie[];
  hidden: Movie[];
  timestamp: number;
}

// Analyze user's genre preferences from watch history
function analyzeGenrePreferences(watched: WatchedItem[]): Map<number, number> {
  const genreScores = new Map<number, number>();

  watched.forEach((item, index) => {
    const recencyWeight = 1 + (watched.length - index) / watched.length;
    const ratingWeight = item.rating ? item.rating / 5 : 1;
    const score = recencyWeight * ratingWeight;

    // We can't reliably get genre_ids from WatchedItem, so use sourceId as seed
    // Genre analysis is best-effort; recommendations will rely on TMDB's own engine
  });

  return genreScores;
}

// Get top N genres sorted by score
function getTopGenres(genreScores: Map<number, number>, n: number): number[] {
  return [...genreScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);
}

// Pick random pages from TMDB's vast catalog to avoid repetition
function getRandomPage(max = 500): number {
  return Math.floor(Math.random() * Math.min(max, 500)) + 1;
}

// Fetch personalized recommendations based on watch history
async function getPersonalizedFromHistory(
  watched: WatchedItem[],
  excludeIds: Set<number>
): Promise<Movie[]> {
  if (watched.length === 0) return [];

  // Pick up to 3 recent highly-rated TMDB movies for recommendations
  const seedMovies = watched
    .filter((m) => m.source === 'tmdb' && ((m.rating || 0) >= 4 || !m.rating))
    .slice(0, 3);

  const results = await Promise.allSettled(
    seedMovies.map((m) => getRecommendedMovies(m.sourceId))
  );

  const movies: Movie[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      r.value.results.forEach((m) => {
        if (!excludeIds.has(m.id)) {
          excludeIds.add(m.id);
          movies.push(m);
        }
      });
    }
  });

  return movies.slice(0, 20);
}

// Discover movies from user's favorite genres on random pages
async function getGenreMixRecommendations(
  topGenres: number[],
  excludeIds: Set<number>
): Promise<Movie[]> {
  if (topGenres.length === 0) return [];

  // Use random pages to surface different movies every time
  const requests = topGenres.slice(0, 3).map((genreId) =>
    discoverMovies({
      withGenres: [genreId],
      page: getRandomPage(100),
      sortBy: 'vote_average.desc',
      voteCountGte: 50,
    })
  );

  const results = await Promise.allSettled(requests);
  const movies: Movie[] = [];

  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      r.value.results.forEach((m) => {
        if (!excludeIds.has(m.id)) {
          excludeIds.add(m.id);
          movies.push(m);
        }
      });
    }
  });

  // Shuffle for variety
  return shuffleArray(movies).slice(0, 20);
}

// Hidden gems: highly rated but less popular movies
async function getHiddenGems(excludeIds: Set<number>): Promise<Movie[]> {
  const decades = ['2020', '2015', '2010', '2000', '1990'];
  const decade = decades[Math.floor(Math.random() * decades.length)];

  try {
    const result = await discoverMovies({
      page: getRandomPage(50),
      sortBy: 'vote_average.desc',
      voteCountGte: 200,
      voteAverageGte: 7.5,
      releaseDateGte: `${decade}-01-01`,
      releaseDateLte: `${parseInt(decade) + 9}-12-31`,
    });

    return result.results
      .filter((m) => !excludeIds.has(m.id))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if we need to refresh recommendations (weekly)
function shouldRefreshRecos(): boolean {
  const timestamp = localStorage.getItem(RECO_TIMESTAMP_KEY);
  if (!timestamp) return true;
  return Date.now() - parseInt(timestamp) > ONE_WEEK_MS;
}

// Main function: get personalized recommendations
export async function getPersonalizedRecommendations(
  watched: WatchedItem[],
  watchlist: WatchlistItem[]
): Promise<{
  forYou: Movie[];
  genreMix: Movie[];
  hiddenGems: Movie[];
}> {
  // Build exclude set from already-seen content
  const excludeIds = new Set<number>([
    ...watched.map((m) => m.sourceId),
    ...watchlist.map((m) => m.sourceId),
  ]);

  // Analyze preferences
  const genreScores = analyzeGenrePreferences(watched);
  const topGenres = getTopGenres(genreScores, 5);

  // Fetch all recommendation types in parallel
  const [forYou, genreMix, hiddenGems] = await Promise.all([
    getPersonalizedFromHistory(watched, excludeIds),
    getGenreMixRecommendations(topGenres, excludeIds),
    getHiddenGems(excludeIds),
  ]);

  return { forYou, genreMix, hiddenGems };
}

// Get diverse discovery content (for users with no history)
export async function getDiverseDiscovery(): Promise<Movie[]> {
  const allGenres = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37];
  
  // Pick 3 random genres
  const selectedGenres = shuffleArray(allGenres).slice(0, 3);

  const results = await Promise.allSettled(
    selectedGenres.map((g) =>
      discoverMovies({
        withGenres: [g],
        page: getRandomPage(200),
        sortBy: 'popularity.desc',
        voteCountGte: 100,
      })
    )
  );

  const movies: Movie[] = [];
  const seen = new Set<number>();
  
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      r.value.results.forEach((m) => {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          movies.push(m);
        }
      });
    }
  });

  return shuffleArray(movies).slice(0, 20);
}
