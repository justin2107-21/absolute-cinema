// AniList GraphQL API integration for anime recommendations

import { supabase } from '@/integrations/supabase/client';

const ANILIST_API = 'https://graphql.anilist.co';

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  chapters: number | null;
  status: string;
  type: 'ANIME' | 'MANGA';
  season: string | null;
  seasonYear: number | null;
  format?: string | null;
}

export interface AniListDetailMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string };
  synonyms: string[];
  coverImage: { extraLarge: string; large: string };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  episodes: number | null;
  duration: number | null;
  chapters: number | null;
  volumes: number | null;
  status: string;
  type: 'ANIME' | 'MANGA';
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  source: string | null;
  hashtag: string | null;
  studios: { nodes: { id: number; name: string; isAnimationStudio: boolean }[] };
  trailer: { id: string; site: string } | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  characters: {
    edges: {
      role: string;
      node: {
        id: number;
        name: { full: string };
        image: { large: string; medium: string };
      };
      voiceActors: {
        id: number;
        name: { full: string };
        image: { large: string; medium: string };
        language: string;
      }[];
    }[];
  };
  staff: {
    edges: {
      role: string;
      node: {
        id: number;
        name: { full: string };
        image: { large: string; medium: string };
      };
    }[];
  };
  recommendations: {
    nodes: {
      rating: number;
      mediaRecommendation: {
        id: number;
        title: { english: string | null; romaji: string };
        coverImage: { large: string };
        type: string;
        averageScore: number | null;
        format: string | null;
      } | null;
    }[];
  };
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: { english: string | null; romaji: string };
        coverImage: { large: string };
        type: string;
        averageScore: number | null;
        format: string | null;
      };
    }[];
  };
  stats: {
    statusDistribution: { status: string; amount: number }[];
    scoreDistribution: { score: number; amount: number }[];
  } | null;
}

interface AniListResponse {
  data: {
    Page: {
      media: AniListMedia[];
    };
  };
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large medium }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  episodes
  chapters
  status
  type
  format
  season
  seasonYear
`;

// Map moods to AniList genres
const moodToAniListGenres: Record<string, string[]> = {
  happy: ['Comedy', 'Slice of Life'],
  sad: ['Drama', 'Tragedy'],
  stressed: ['Slice of Life', 'Comedy'],
  romantic: ['Romance'],
  excited: ['Action', 'Adventure'],
  relaxed: ['Slice of Life', 'Music'],
  lonely: ['Drama', 'Romance'],
  anxious: ['Comedy', 'Slice of Life'],
  burned_out: ['Slice of Life', 'Comedy'],
  nostalgic: ['Drama', 'Slice of Life'],
  heartbroken: ['Drama', 'Romance'],
  motivated: ['Sports', 'Action'],
  bored: ['Action', 'Mystery', 'Thriller'],
  hopeful: ['Drama', 'Fantasy'],
  curious: ['Mystery', 'Sci-Fi', 'Psychological'],
};

async function anilistFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  try {
    // Use edge function proxy to avoid CORS issues
    const { data: proxyData, error: proxyError } = await supabase.functions.invoke('anilist-proxy', {
      body: { query, variables },
    });

    if (proxyError) {
      console.error('AniList proxy error, falling back to direct:', proxyError);
      // Fallback to direct fetch
      return await anilistFetchDirect<T>(query, variables);
    }

    if (proxyData?.errors?.length) {
      console.error('AniList GraphQL error:', proxyData.errors);
      return null;
    }

    return proxyData?.data ?? null;
  } catch (error) {
    console.error('AniList proxy failed, trying direct:', error);
    return await anilistFetchDirect<T>(query, variables);
  }
}

async function anilistFetchDirect<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (!response.ok || data?.errors?.length) {
      console.error('AniList GraphQL error:', data?.errors || response.statusText);
      return null;
    }

    return data?.data ?? null;
  } catch (error) {
    console.error('AniList API error:', error);
    return null;
  }
}

export async function getAnimeByMood(mood: string, page = 1): Promise<AniListMedia[]> {
  const genres = moodToAniListGenres[mood] || ['Action', 'Adventure'];
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(genre_in: $genres, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query, { page, perPage: 20, genres });
  return data?.Page?.media || [];
}

export async function getMangaByMood(mood: string, page = 1): Promise<AniListMedia[]> {
  const genres = moodToAniListGenres[mood] || ['Action', 'Adventure'];
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(genre_in: $genres, type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query, { page, perPage: 10, genres });
  return data?.Page?.media || [];
}

export async function searchAnime(searchTerm: string): Promise<AniListMedia[]> {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 25) {
        media(search: $search, sort: SEARCH_MATCH, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query, { search: searchTerm });
  return data?.Page?.media || [];
}

export async function getPopularAnime(): Promise<AniListMedia[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
  return data?.Page?.media || [];
}

export async function getTrendingAnime(): Promise<AniListMedia[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
  return data?.Page?.media || [];
}

export async function getUpcomingNextSeasonAnime(): Promise<AniListMedia[]> {
  const now = new Date();
  const month = now.getMonth();
  // Determine next season
  let nextSeason: string;
  let nextYear = now.getFullYear();
  if (month < 3) { nextSeason = 'SPRING'; }
  else if (month < 6) { nextSeason = 'SUMMER'; }
  else if (month < 9) { nextSeason = 'FALL'; }
  else { nextSeason = 'WINTER'; nextYear++; }

  const query = `
    query ($season: MediaSeason, $seasonYear: Int) {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query, { season: nextSeason, seasonYear: nextYear });
  return data?.Page?.media || [];
}

export async function getAllTimePopularAnime(): Promise<AniListMedia[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query);
  return data?.Page?.media || [];
}

export async function getTop100Anime(page = 1): Promise<AniListMedia[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC, isAdult: false, averageScore_greater: 1) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(query, { page, perPage: 50 });
  return data?.Page?.media || [];
}

export async function getAniListDetails(id: number): Promise<AniListDetailMedia | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        id
        title { romaji english native }
        synonyms
        coverImage { extraLarge large }
        bannerImage
        description(asHtml: false)
        genres
        averageScore
        meanScore
        popularity
        favourites
        episodes
        duration
        chapters
        volumes
        status
        type
        season
        seasonYear
        format
        source
        hashtag
        studios { nodes { id name isAnimationStudio } }
        trailer { id site }
        startDate { year month day }
        endDate { year month day }
        characters(sort: ROLE, perPage: 20) {
          edges {
            role
            node {
              id
              name { full }
              image { large medium }
            }
            voiceActors(language: JAPANESE) {
              id
              name { full }
              image { large medium }
              language
            }
          }
        }
        staff(perPage: 15) {
          edges {
            role
            node {
              id
              name { full }
              image { large medium }
            }
          }
        }
        recommendations(perPage: 10, sort: RATING_DESC) {
          nodes {
            rating
            mediaRecommendation {
              id
              title { english romaji }
              coverImage { large }
              type
              averageScore
              format
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title { english romaji }
              coverImage { large }
              type
              averageScore
              format
            }
          }
        }
        stats {
          statusDistribution { status amount }
          scoreDistribution { score amount }
        }
      }
    }
  `;
  const data = await anilistFetch<{ Media: AniListDetailMedia }>(query, { id });
  return data?.Media || null;
}
