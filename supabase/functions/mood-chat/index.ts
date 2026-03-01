import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOOD_SYSTEM_PROMPT = `You are Lumina AI, a compassionate and emotionally intelligent recommendation assistant for CinemaSync.

PERSONALITY:
- Warm, understanding, and genuinely caring
- Never robotic or clinical
- Validates emotions before offering suggestions
- Uses natural, conversational language
- Feels like talking to a thoughtful friend

RESPONSE STRUCTURE:
1. ALWAYS start by acknowledging and validating the user's feelings in 1-2 sentences
2. Show genuine empathy and understanding
3. End with a hopeful transition to personalized recommendations

Always respond in 2-3 sentences maximum. Be genuine, not generic. Make the user feel heard and understood.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long (max 2000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI gateway instead of OpenAI directly
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: MOOD_SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_mood_and_preferences",
              description: "Perform detailed emotional analysis and extract movie/TV preferences from the user's message",
              parameters: {
                type: "object",
                properties: {
                  primary_emotion: {
                    type: "string",
                    enum: ["happy", "sad", "stressed", "romantic", "excited", "relaxed", "lonely", "anxious", "burned_out", "overwhelmed", "nostalgic", "heartbroken", "motivated", "bored", "hopeful", "curious"],
                    description: "The primary detected emotion",
                  },
                  secondary_emotion: {
                    type: "string",
                    enum: ["happy", "sad", "stressed", "romantic", "excited", "relaxed", "lonely", "anxious", "burned_out", "overwhelmed", "nostalgic", "heartbroken", "motivated", "bored", "hopeful", "curious", "none"],
                    description: "A secondary emotion if present, or 'none'",
                  },
                  intent: {
                    type: "string",
                    description: "What the user wants (e.g., 'escape stress', 'feel uplifted', 'cry it out', 'get thrills')",
                  },
                  genres: {
                    type: "array",
                    items: { type: "string" },
                    description: "Preferred genres mentioned or inferred",
                  },
                  language: {
                    type: "string",
                    description: "Preferred language/country if mentioned. Empty string if not specified.",
                  },
                  tone: {
                    type: "string",
                    enum: ["light", "dark", "intense", "comforting", "inspiring", "bittersweet", "whimsical", "gritty"],
                    description: "The tone preference for recommendations",
                  },
                  popularity_preference: {
                    type: "string",
                    enum: ["trending", "top_rated", "underrated", "most_watched", "any"],
                    description: "Whether user prefers trending, top-rated, underrated, or most watched content",
                  },
                  content_type: {
                    type: "string",
                    enum: ["movie", "tv", "both"],
                    description: "Whether the user wants movies, TV series, or both",
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key themes or specific preferences",
                  },
                },
                required: ["primary_emotion", "secondary_emotion", "intent", "genres", "tone", "popularity_preference", "content_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    let aiMessage = choice.message.content || "";
    let moodData = null;

    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function.name === "analyze_mood_and_preferences") {
          try {
            moodData = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("Failed to parse mood data:", e);
          }
        }
      }
    }

    // If we got tool calls but no content, make a follow-up call for the empathetic response
    if (!aiMessage && moodData) {
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: MOOD_SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        aiMessage = followUpData.choices[0]?.message?.content || getDefaultResponse(moodData.primary_emotion);
      }
    }

    if (!aiMessage) {
      aiMessage = getDefaultResponse(moodData?.primary_emotion || inferMood(message));
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      mood: moodData?.primary_emotion || inferMood(message),
      preferences: moodData || {
        primary_emotion: inferMood(message),
        secondary_emotion: "none",
        intent: "find entertainment",
        genres: [],
        language: "",
        tone: "comforting",
        popularity_preference: "any",
        content_type: "both",
        keywords: [],
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mood chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultResponse(mood: string): string {
  const r: Record<string, string> = {
    happy: "That's wonderful to hear! Your positive energy is contagious. Let me find some feel-good movies to keep that vibe going.",
    sad: "I hear you, and it's okay to feel this way. Let me find movies that understand, or ones that gently lift your spirits.",
    stressed: "I completely understand – stress can feel so heavy. Let me find something to help you unwind and escape.",
    romantic: "Ah, love is in the air! Let me find some swooning romance and heartwarming stories for you.",
    excited: "I love your energy! Let's channel that excitement into some thrilling entertainment.",
    relaxed: "Perfect mood for some cozy viewing. Let me match your peaceful vibe.",
    lonely: "I'm here with you. Movies have a beautiful way of making us feel less alone.",
    anxious: "Take a deep breath – I understand. Let me suggest some calming films to ease your mind.",
    burned_out: "Burnout is real and exhausting. You deserve something comforting right now.",
    overwhelmed: "That's a lot to carry. Let me find something light for a much-needed break.",
    nostalgic: "There's something beautiful about looking back. Let me capture that warm feeling.",
    heartbroken: "I'm so sorry you're going through this. I'm here for you.",
    motivated: "I love that drive! Let me find inspiring stories to fuel your momentum.",
    bored: "Let's shake things up! I'll find something unexpected and engaging.",
    hopeful: "That optimism is beautiful. Let me match it with uplifting stories.",
    curious: "I love your sense of wonder! Let me find something thought-provoking.",
  };
  return r[mood] || r.happy;
}

function inferMood(message: string): string {
  const l = message.toLowerCase();
  if (l.match(/sad|down|upset|cry|depressed/)) return "sad";
  if (l.match(/stress|anxious|worried|overwhelm/)) return "stressed";
  if (l.match(/love|romantic|date|relationship/)) return "romantic";
  if (l.match(/excit|thrill|adventure|action/)) return "excited";
  if (l.match(/relax|calm|peace|chill/)) return "relaxed";
  if (l.match(/lonely|alone|isolated/)) return "lonely";
  if (l.match(/burned|exhausted|tired/)) return "burned_out";
  if (l.match(/nostalg|remember|childhood/)) return "nostalgic";
  if (l.match(/heartbr|breakup/)) return "heartbroken";
  if (l.match(/motiv|inspir/)) return "motivated";
  if (l.match(/bored/)) return "bored";
  if (l.match(/hope|optimis/)) return "hopeful";
  if (l.match(/curious|wonder/)) return "curious";
  return "happy";
}
