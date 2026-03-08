import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TMDB_API_KEY = "df0c550327ce5a364aac2cb1e2420f9d";
const TMDB_BASE = "https://api.themoviedb.org/3";

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
  episodes: EpisodeInfo[]; // first season episodes as sample
  status: string;
  firstAirDate: string | null;
  mediaType: "movie" | "tv";
  runtime?: number;
}

async function fetchTmdbMetadata(title: string, type: string): Promise<TmdbMetadata | null> {
  try {
    const mediaType = type === "anime" || type === "tv" ? "tv" : "movie";
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

      // Fetch episodes for the latest season
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
            content: `You are Lumina AI, an entertainment expert. When shown an image, analyze it to identify if it's from a movie, TV show, anime, or manga.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting. No asterisks (*), no bold (**), no headings (##), no underscores (__).
- Write plain text only.
- Vary your opening phrases. Choose randomly from: "This appears to be from...", "This looks like a scene from...", "I'm fairly certain this image comes from...", "This frame seems to be from...", "It looks like this screenshot is from...", "I recognize this as..."
- Never repeat the same opening phrase twice in a conversation.

If you can identify the source:
- State the title clearly
- Genre and year
- A brief description of the scene shown
- Do NOT include season/episode counts (the system will fetch live data)

If you're not confident:
- Say "This might be from [title], but I'm not completely certain."
- Suggest similar-looking titles

If the image is not from any entertainment media, describe what you see and ask how you can help.

IMPORTANT: At the end of your response, on a new line, output the following metadata tag (this is for the system, not the user):
[IDENTIFIED:title_here:type_here]
where type is one of: movie, tv, anime
Only include this tag if you confidently identified the content.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: message || "What movie, anime, TV show, or manga is this from?" },
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

    // Extract identification metadata
    let identifiedTitle: string | null = null;
    let identifiedType: string | null = null;
    const metaMatch = aiMessage.match(/\[IDENTIFIED:(.+?):(.+?)\]/);
    if (metaMatch) {
      identifiedTitle = metaMatch[1].trim();
      identifiedType = metaMatch[2].trim();
      aiMessage = aiMessage.replace(/\[IDENTIFIED:.+?\]/g, "").trim();
    }

    // Sanitize markdown
    aiMessage = aiMessage.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
    aiMessage = aiMessage.replace(/#{1,6}\s*/g, "");
    aiMessage = aiMessage.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");

    // Fetch live TMDB metadata if we identified something
    let tmdbMetadata: TmdbMetadata | null = null;
    if (identifiedTitle && identifiedType) {
      tmdbMetadata = await fetchTmdbMetadata(identifiedTitle, identifiedType);
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        identifiedTitle,
        identifiedType,
        tmdbMetadata,
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
