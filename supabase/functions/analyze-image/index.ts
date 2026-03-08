import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_API_KEY = "df0c550327ce5a364aac2cb1e2420f9d";
const TMDB_BASE = "https://api.themoviedb.org/3";
const ANILIST_API = "https://graphql.anilist.co";

// ─── TYPES ───
interface SeasonInfo {
  season_number: number;
  episode_count: number;
  name: string;
  air_date: string | null;
}

interface EpisodeInfo {
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  still_path: string | null;
  vote_average: number;
}

interface TmdbMetadata {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  totalSeasons: number;
  totalEpisodes: number;
  seasons: SeasonInfo[];
  episodes: EpisodeInfo[];
  status: string;
  firstAirDate: string | null;
  mediaType: "movie" | "tv";
  runtime?: number;
}

interface AniListMetadata {
  anilistId: number;
  title: string;
  titleEnglish: string | null;
  overview: string;
  posterPath: string | null;
  bannerPath: string | null;
  voteAverage: number;
  totalEpisodes: number | null;
  status: string;
  year: number | null;
  genres: string[];
  format: string | null;
}

interface CharacterInfo {
  name: string;
  role?: string;
  imageUrl?: string;
}

// ─── FETCH ANILIST METADATA ───
async function fetchAniListMetadata(title: string): Promise<AniListMetadata | null> {
  try {
    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large }
          bannerImage
          averageScore
          episodes
          status
          seasonYear
          genres
          format
        }
      }
    `;
    
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { search: title } }),
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    const media = data?.data?.Media;
    if (!media) return null;
    
    return {
      anilistId: media.id,
      title: media.title?.english || media.title?.romaji || title,
      titleEnglish: media.title?.english || null,
      overview: media.description?.replace(/<[^>]*>/g, '') || "",
      posterPath: media.coverImage?.extraLarge || media.coverImage?.large || null,
      bannerPath: media.bannerImage || null,
      voteAverage: (media.averageScore || 0) / 10,
      totalEpisodes: media.episodes || null,
      status: media.status || "Unknown",
      year: media.seasonYear || null,
      genres: media.genres || [],
      format: media.format || null,
    };
  } catch (err) {
    console.error("AniList fetch error:", err);
    return null;
  }
}

// ─── FETCH TMDB METADATA ───
async function fetchTmdbMetadata(title: string, type: string): Promise<TmdbMetadata | null> {
  try {
    const mediaType = type === "tv" ? "tv" : "movie";
    const searchUrl = `${TMDB_BASE}/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const result = searchData.results?.[0];
    if (!result) return null;

    const detailUrl = `${TMDB_BASE}/${mediaType}/${result.id}?api_key=${TMDB_API_KEY}`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) return null;
    const detail = await detailRes.json();

    if (mediaType === "tv") {
      const seasons: SeasonInfo[] = (detail.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
          season_number: s.season_number,
          episode_count: s.episode_count,
          name: s.name,
          air_date: s.air_date,
        }));

      let episodes: EpisodeInfo[] = [];
      const latestSeasonNum = seasons.length > 0 ? seasons[seasons.length - 1].season_number : 1;
      try {
        const epUrl = `${TMDB_BASE}/tv/${result.id}/season/${latestSeasonNum}?api_key=${TMDB_API_KEY}`;
        const epRes = await fetch(epUrl);
        if (epRes.ok) {
          const epData = await epRes.json();
          episodes = (epData.episodes || []).slice(0, 20).map((e: any) => ({
            season_number: e.season_number,
            episode_number: e.episode_number,
            name: e.name,
            overview: e.overview || "",
            air_date: e.air_date,
            still_path: e.still_path,
            vote_average: e.vote_average || 0,
          }));
        }
      } catch { /* ignore episode fetch errors */ }

      return {
        tmdbId: result.id,
        title: detail.name || detail.title || title,
        overview: detail.overview || "",
        posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path,
        voteAverage: detail.vote_average || 0,
        totalSeasons: detail.number_of_seasons || seasons.length,
        totalEpisodes: detail.number_of_episodes || 0,
        seasons,
        episodes,
        status: detail.status || "Unknown",
        firstAirDate: detail.first_air_date || null,
        mediaType: "tv",
      };
    } else {
      return {
        tmdbId: result.id,
        title: detail.title || title,
        overview: detail.overview || "",
        posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path,
        voteAverage: detail.vote_average || 0,
        totalSeasons: 0,
        totalEpisodes: 0,
        seasons: [],
        episodes: [],
        status: detail.status || "Unknown",
        firstAirDate: detail.release_date || null,
        mediaType: "movie",
        runtime: detail.runtime,
      };
    }
  } catch (err) {
    console.error("TMDB fetch error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl, message } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are MoodMatch AI, an entertainment expert specializing in movies, TV shows, anime, and manga. When shown an image, identify the content and provide detailed analysis.

CRITICAL OUTPUT FORMAT - You MUST output a structured block at the END of your response:
[METADATA]
TITLE: <title>
TYPE: <movie|tv|anime|manga>
CHARACTER: <character name if identifiable, or "Unknown">
GENRE: <comma-separated genres>
YEAR: <year or "Unknown">
SEASON: <season number or "Unknown">
EPISODE: <episode number or "Unknown">
EPISODE_TITLE: <episode title or "Unknown">
TIMESTAMP: <approximate timestamp like "12:34" or "Unknown">
[/METADATA]

INSTRUCTIONS:
1. Identify the title of the movie, show, or anime
2. If characters are visible, identify them by name (e.g., "Saitama", "Eleven", "Walter White")
3. For TV/anime, try to identify the specific season and episode based on visual cues (costumes, settings, events)
4. Estimate a timestamp if the scene is recognizable
5. List the genre(s)
6. Provide the year of release

RESPONSE STYLE:
- Be conversational but informative
- Vary your opening: "This appears to be from...", "I recognize this as...", "This looks like a scene from..."
- No markdown formatting (no **, no ##, no _)
- Plain text only

If you cannot identify the content, describe what you see and suggest possibilities.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: message || "What movie, anime, TV show, or manga is this from? Please identify any characters visible." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Vision API error:", response.status, errorText);
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    let aiMessage = data.choices[0]?.message?.content || "I couldn't analyze this image. Please try again.";

    // Parse structured metadata from response
    let identifiedTitle: string | null = null;
    let identifiedType: string | null = null;
    let character: string | null = null;
    let genre: string | null = null;
    let year: string | null = null;
    let season: string | null = null;
    let episode: string | null = null;
    let episodeTitle: string | null = null;
    let timestamp: string | null = null;

    const metadataMatch = aiMessage.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
    if (metadataMatch) {
      const metaBlock = metadataMatch[1];
      const titleMatch = metaBlock.match(/TITLE:\s*(.+)/i);
      const typeMatch = metaBlock.match(/TYPE:\s*(.+)/i);
      const charMatch = metaBlock.match(/CHARACTER:\s*(.+)/i);
      const genreMatch = metaBlock.match(/GENRE:\s*(.+)/i);
      const yearMatch = metaBlock.match(/YEAR:\s*(.+)/i);
      const seasonMatch = metaBlock.match(/SEASON:\s*(.+)/i);
      const episodeMatch = metaBlock.match(/EPISODE:\s*(\d+)/i);
      const epTitleMatch = metaBlock.match(/EPISODE_TITLE:\s*(.+)/i);
      const timestampMatch = metaBlock.match(/TIMESTAMP:\s*(.+)/i);

      if (titleMatch) identifiedTitle = titleMatch[1].trim();
      if (typeMatch) identifiedType = typeMatch[1].trim().toLowerCase();
      if (charMatch && charMatch[1].trim().toLowerCase() !== "unknown") character = charMatch[1].trim();
      if (genreMatch && genreMatch[1].trim().toLowerCase() !== "unknown") genre = genreMatch[1].trim();
      if (yearMatch && yearMatch[1].trim().toLowerCase() !== "unknown") year = yearMatch[1].trim();
      if (seasonMatch && seasonMatch[1].trim().toLowerCase() !== "unknown") season = seasonMatch[1].trim();
      if (episodeMatch) episode = episodeMatch[1].trim();
      if (epTitleMatch && epTitleMatch[1].trim().toLowerCase() !== "unknown") episodeTitle = epTitleMatch[1].trim();
      if (timestampMatch && timestampMatch[1].trim().toLowerCase() !== "unknown") timestamp = timestampMatch[1].trim();

      // Remove metadata block from visible message
      aiMessage = aiMessage.replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/g, "").trim();
    }

    // Legacy fallback for old format
    if (!identifiedTitle) {
      const legacyMatch = aiMessage.match(/\[IDENTIFIED:(.+?):(.+?)\]/);
      if (legacyMatch) {
        identifiedTitle = legacyMatch[1].trim();
        identifiedType = legacyMatch[2].trim();
        aiMessage = aiMessage.replace(/\[IDENTIFIED:.+?\]/g, "").trim();
      }
    }

    // Sanitize markdown
    aiMessage = aiMessage.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
    aiMessage = aiMessage.replace(/#{1,6}\s*/g, "");
    aiMessage = aiMessage.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");

    // Fetch metadata from correct API based on type
    let tmdbMetadata: TmdbMetadata | null = null;
    let anilistMetadata: AniListMetadata | null = null;

    if (identifiedTitle && identifiedType) {
      if (identifiedType === "anime" || identifiedType === "manga") {
        // Use AniList for anime/manga
        anilistMetadata = await fetchAniListMetadata(identifiedTitle);
      } else {
        // Use TMDB for movies/TV
        tmdbMetadata = await fetchTmdbMetadata(identifiedTitle, identifiedType);
      }
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        identifiedTitle,
        identifiedType,
        character,
        genre,
        year,
        season,
        episode,
        episodeTitle,
        timestamp,
        tmdbMetadata,
        anilistMetadata,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Image analysis error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
