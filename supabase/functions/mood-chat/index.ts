import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LUMINA_SYSTEM_PROMPT = `You are Lumina AI, a friendly conversational assistant for CinemaSync — a movie, TV show, and anime recommendation platform.

CRITICAL RULES:
1. You do NOT automatically detect moods or emotions.
2. You do NOT generate mood tags like "happy", "sad", "comforting" etc.
3. You ONLY recommend content when the user EXPLICITLY asks for recommendations.
4. NEVER use markdown formatting. No asterisks (*), no bold (**), no headings (##), no underscores (__). Write plain text only.
5. NEVER output XML tags or tool call syntax in your response text.
6. NEVER repeat the same phrase twice in a row. Vary your language on every response.
7. Avoid starting multiple responses with "I'd be happy to help" or similar repeated openers. Use diverse, natural conversation starters.

INTENT DETECTION:
- Greetings (hello, hi, hey, good day, good morning, etc.): Respond warmly and conversationally. Offer guidance on what you can do.
- Normal conversation: Chat naturally. Be helpful, warm, friendly.
- Recommendation request (recommend, suggest, what should I watch, etc.): ONLY THEN use the analyze_preferences tool to extract preferences and recommend content.
- Search request: Help the user find specific titles.

GREETING RESPONSE FORMAT:
When user sends a greeting, respond like:
"Hello! 👋 I'm Lumina, your entertainment companion. I can help you:
🎬 Get personalized recommendations
💬 Chat about movies, shows & anime
🔎 Find specific titles
What would you like to do?"

RECOMMENDATION RESPONSE:
When user asks for recommendations, acknowledge their request warmly, then use the tool to extract preferences. Keep responses to 2-3 sentences. Example: "Great taste! Let me find some titles you'll love based on that."

IMPORTANT: Never output mood labels. Never automatically show recommendation buttons for greetings or casual conversation.`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages: any[] = [
      { role: "system", content: LUMINA_SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: message },
    ];

    const intent = detectIntent(message);

    const requestBody: any = {
      model: "google/gemini-3-flash-preview",
      messages,
    };

    if (intent === "recommendation") {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "analyze_preferences",
            description: "Extract content preferences from user's recommendation request",
            parameters: {
              type: "object",
              properties: {
                intent: { type: "string", description: "What the user wants" },
                genres: { type: "array", items: { type: "string" }, description: "Preferred genres" },
                language: { type: "string", description: "Preferred language/country if mentioned" },
                tone: { type: "string", enum: ["light", "dark", "intense", "comforting", "inspiring", "bittersweet", "whimsical", "gritty", "any"], description: "Tone preference" },
                popularity_preference: { type: "string", enum: ["trending", "top_rated", "underrated", "most_watched", "any"], description: "Popularity preference" },
                content_type: { type: "string", enum: ["movie", "tv", "anime", "both"], description: "Content type" },
                keywords: { type: "array", items: { type: "string" }, description: "Key themes" },
              },
              required: ["intent", "genres", "tone", "popularity_preference", "content_type"],
              additionalProperties: false,
            },
          },
        },
      ];
      requestBody.tool_choice = "auto";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    let aiMessage = choice.message.content || "";
    let preferences = null;

    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function.name === "analyze_preferences") {
          try {
            preferences = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("Failed to parse preferences:", e);
          }
        }
      }
    }

    // If tool call but no content, generate a follow-up
    if (!aiMessage && preferences) {
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are Lumina AI. The user asked for recommendations and you've analyzed their preferences. Respond with a brief, warm acknowledgment (1-2 sentences) about what you're finding for them. Do NOT use any markdown formatting (no asterisks, bold, headings). Write plain text only. Vary your language - never say 'I'd be happy to help'." },
            { role: "user", content: message },
          ],
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        aiMessage = followUpData.choices[0]?.message?.content || "Great choice! Let me find some recommendations for you.";
      } else {
        aiMessage = "Great choice! Let me find some recommendations for you.";
      }
    }

    // Strip any remaining tool call artifacts or markdown from the message
    aiMessage = sanitizeResponse(aiMessage);

    if (!aiMessage) {
      aiMessage = "I'm here to help! What would you like to talk about or are you looking for recommendations?";
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      intent,
      preferences: preferences || null,
      hasRecommendations: !!preferences,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lumina chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function sanitizeResponse(text: string): string {
  // Remove XML-style tool tags
  let cleaned = text.replace(/<\/?[a-z_]+(?:\s[^>]*)?>(?:\{[^}]*\})?/gi, '');
  // Remove markdown formatting
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

function detectIntent(message: string): "greeting" | "conversation" | "recommendation" | "search" {
  const l = message.toLowerCase().trim();

  if (/^(hi|hello|hey|good\s*(day|morning|afternoon|evening)|howdy|yo|sup|what'?s\s*up|greetings)\b/i.test(l)) {
    if (/recommend|suggest|watch|show me|find me/i.test(l)) return "recommendation";
    return "greeting";
  }

  if (/recommend|suggest|what\s*(should|can|to)\s*i\s*watch|give me|show me.*(?:movie|film|anime|series|show)|find me.*(?:movie|film|anime|series|show)|looking for.*(?:movie|film|anime|series|show)|similar to/i.test(l)) {
    return "recommendation";
  }

  if (/^(search|find|look up|where can i watch)\b/i.test(l)) {
    return "search";
  }

  return "conversation";
}
