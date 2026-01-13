// AniList GraphQL API integration for anime recommendations

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
}

interface AniListResponse {
  data: {
    Page: {
      media: AniListMedia[];
    };
  };
}

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

export async function getAnimeByMood(mood: string, page = 1): Promise<AniListMedia[]> {
  const genres = moodToAniListGenres[mood] || ['Action', 'Adventure'];
  
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(genre_in: $genres, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description(asHtml: false)
          genres
          averageScore
          episodes
          status
          type
          season
          seasonYear
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          page,
          perPage: 20,
          genres,
        },
      }),
    });

    const data: AniListResponse = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}

export async function getMangaByMood(mood: string, page = 1): Promise<AniListMedia[]> {
  const genres = moodToAniListGenres[mood] || ['Action', 'Adventure'];
  
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(genre_in: $genres, type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description(asHtml: false)
          genres
          averageScore
          chapters
          status
          type
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          page,
          perPage: 10,
          genres,
        },
      }),
    });

    const data: AniListResponse = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}

export async function searchAnime(searchTerm: string): Promise<AniListMedia[]> {
  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description(asHtml: false)
          genres
          averageScore
          episodes
          status
          type
          season
          seasonYear
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { search: searchTerm },
      }),
    });

    const data: AniListResponse = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}

export async function getPopularAnime(): Promise<AniListMedia[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description(asHtml: false)
          genres
          averageScore
          episodes
          status
          type
          season
          seasonYear
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data: AniListResponse = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}

export async function getTrendingAnime(): Promise<AniListMedia[]> {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          bannerImage
          description(asHtml: false)
          genres
          averageScore
          episodes
          status
          type
          season
          seasonYear
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data: AniListResponse = await response.json();
    return data.data.Page.media;
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}
