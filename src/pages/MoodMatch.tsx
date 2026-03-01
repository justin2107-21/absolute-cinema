import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, Frown, Zap, Heart, PartyPopper, Coffee, Sparkles, Send, ArrowLeft, Brain,
  Moon, CloudRain, Flame, Lightbulb, Meh, Search, Compass, HeartCrack, Battery,
  Film, Tv, BookOpen, TrendingUp, Star, Eye, AlertCircle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMoviesByMood } from '@/lib/tmdb';
import { getAnimeByMood, getMangaByMood, type AniListMedia } from '@/lib/anilist';
import { getMoodRecommendations, type MoodPreferences, type MoodRecommendations } from '@/lib/moodRecommendations';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { useMood } from '@/contexts/MoodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── QUICK MOOD PICKS CONFIG (static, no OpenAI) ───
const moods = [
  { id: 'happy', label: 'Happy', icon: Smile, color: 'text-mood-happy' },
  { id: 'sad', label: 'Sad', icon: Frown, color: 'text-mood-sad' },
  { id: 'stressed', label: 'Stressed', icon: Zap, color: 'text-mood-stressed' },
  { id: 'romantic', label: 'Romantic', icon: Heart, color: 'text-mood-romantic' },
  { id: 'excited', label: 'Excited', icon: PartyPopper, color: 'text-mood-excited' },
  { id: 'relaxed', label: 'Relaxed', icon: Coffee, color: 'text-mood-relaxed' },
  { id: 'lonely', label: 'Lonely', icon: Moon, color: 'text-mood-sad' },
  { id: 'anxious', label: 'Anxious', icon: CloudRain, color: 'text-mood-stressed' },
  { id: 'burned_out', label: 'Burned Out', icon: Battery, color: 'text-mood-stressed' },
  { id: 'nostalgic', label: 'Nostalgic', icon: Brain, color: 'text-mood-relaxed' },
  { id: 'heartbroken', label: 'Heartbroken', icon: HeartCrack, color: 'text-mood-sad' },
  { id: 'motivated', label: 'Motivated', icon: Flame, color: 'text-mood-excited' },
  { id: 'bored', label: 'Bored', icon: Meh, color: 'text-muted-foreground' },
  { id: 'hopeful', label: 'Hopeful', icon: Lightbulb, color: 'text-mood-happy' },
  { id: 'curious', label: 'Curious', icon: Compass, color: 'text-primary' },
];

// ─── LUMINA AI CHAT MESSAGE TYPE ───
interface LuminaMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  showRecommendations?: boolean;
  mood?: string;
  preferences?: MoodPreferences;
  recommendations?: MoodRecommendations | null;
  isLoadingRecs?: boolean;
  isError?: boolean;
}

export default function MoodMatch() {
  // ─── HARD STATE SEPARATION ───
  const [quickMoodMode, setQuickMoodMode] = useState(false);
  const [luminaChatMode, setLuminaChatMode] = useState(false);

  // Quick Mood state (completely independent)
  const [quickMoodId, setQuickMoodId] = useState<string | null>(null);
  const [quickMoodTab, setQuickMoodTab] = useState<'movies' | 'anime' | 'manga'>('movies');

  // Lumina AI state (completely independent)
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<LuminaMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();
  const { setMood } = useMood();
  const { isAuthenticated, user } = useAuth();

  // ─── QUICK MOOD QUERIES (only when quickMoodMode is true) ───
  const { data: moodMovies, isLoading: isLoadingMovies } = useQuery({
    queryKey: ['quickMoodMovies', quickMoodId],
    queryFn: () => getMoviesByMood(quickMoodId!),
    enabled: !!quickMoodId && quickMoodMode && quickMoodTab === 'movies',
  });
  const { data: moodAnime, isLoading: isLoadingAnime } = useQuery({
    queryKey: ['quickMoodAnime', quickMoodId],
    queryFn: () => getAnimeByMood(quickMoodId!),
    enabled: !!quickMoodId && quickMoodMode && quickMoodTab === 'anime',
  });
  const { data: moodManga, isLoading: isLoadingManga } = useQuery({
    queryKey: ['quickMoodManga', quickMoodId],
    queryFn: () => getMangaByMood(quickMoodId!),
    enabled: !!quickMoodId && quickMoodMode && quickMoodTab === 'manga',
  });

  // ─── LOAD LUMINA CONVERSATION (on mount) ───
  useEffect(() => {
    if (isAuthenticated && user) loadConversation();
  }, [isAuthenticated, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadConversation = async () => {
    if (!user) return;
    try {
      const { data: conversations } = await supabase
        .from('chat_conversations').select('*')
        .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1);
      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversationId(conv.id);
        const { data: messages } = await supabase
          .from('chat_messages').select('*')
          .eq('conversation_id', conv.id).order('created_at', { ascending: true });
        if (messages) {
          setChatHistory(messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            showRecommendations: m.show_recommendations || false,
            preferences: m.recommendations as unknown as MoodPreferences | undefined,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (message: LuminaMessage, convId: string) => {
    if (!user) return;
    try {
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        show_recommendations: message.showRecommendations || false,
        recommendations: message.preferences ? (message.preferences as any) : null,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const createOrUpdateConversation = async (mood?: string): Promise<string> => {
    if (!user) return '';
    try {
      if (conversationId) {
        await supabase.from('chat_conversations')
          .update({ mood, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        return conversationId;
      } else {
        const { data } = await supabase.from('chat_conversations')
          .insert({ user_id: user.id, mood }).select().single();
        if (data) { setConversationId(data.id); return data.id; }
      }
    } catch (error) {
      console.error('Error with conversation:', error);
    }
    return '';
  };

  // ─── QUICK MOOD HANDLER (no OpenAI, no Lumina) ───
  const handleQuickMoodSelect = (moodId: string) => {
    setQuickMoodId(moodId);
    setQuickMoodMode(true);
    setLuminaChatMode(false); // Ensure isolation
    setMood(moodId as any);
  };

  // ─── LUMINA AI: Show Personalized Recommendations ───
  const handleShowRecommendations = async (messageIndex: number, prefs: MoodPreferences) => {
    setChatHistory(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, isLoadingRecs: true } : m
    ));
    try {
      const recs = await getMoodRecommendations(prefs);
      setChatHistory(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, recommendations: recs, isLoadingRecs: false, showRecommendations: false } : m
      ));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to load recommendations.');
      setChatHistory(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, isLoadingRecs: false } : m
      ));
    }
  };

  // ─── LUMINA AI: Chat Submit (100% OpenAI, NO FALLBACK to Quick Mood) ───
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    // Activate Lumina mode, deactivate Quick Mood
    setLuminaChatMode(true);
    setQuickMoodMode(false);

    const userMessage: LuminaMessage = { role: 'user', content: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/mood-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          message: chatInput,
          conversationHistory: chatHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      const prefs: MoodPreferences = data.preferences;
      const aiMessage: LuminaMessage = {
        role: 'assistant',
        content: data.message,
        showRecommendations: true,
        mood: data.mood,
        preferences: prefs,
      };

      setChatHistory((prev) => [...prev, aiMessage]);

      // Update global theme
      if (data.mood) setMood(data.mood as any);

      // Persist to DB
      if (isAuthenticated && user) {
        const convId = await createOrUpdateConversation(data.mood);
        await saveMessage(userMessage, convId);
        await saveMessage(aiMessage, convId);
      }
    } catch (error: any) {
      console.error('Lumina AI error:', error);
      const isRateLimit = error?.message === 'RATE_LIMIT';
      const errorMessage: LuminaMessage = {
        role: 'assistant',
        content: isRateLimit
          ? "I'm experiencing high demand right now. Please wait a moment and try again — I'll be ready to help you shortly!"
          : "I'm having trouble connecting right now. Please try again in a moment — I want to give you the best personalized recommendations.",
        isError: true,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
      toast.error(isRateLimit
        ? 'Rate limit reached. Please wait a moment and try again.'
        : 'Lumina AI connection issue. Please try again.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAnimeClick = (anime: AniListMedia) => {
    navigate(`/anime/${anime.id}`);
  };

  const goHome = () => {
    setQuickMoodMode(false);
    setLuminaChatMode(false);
    setQuickMoodId(null);
    setMood('default');
  };

  const currentMoodConfig = moods.find((m) => m.id === quickMoodId);

  // ─── INLINE RECS RENDERER (Lumina only) ───
  const renderInlineRecs = (recs: MoodRecommendations) => (
    <div className="space-y-5 mt-3">
      {recs.popular.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Star className="h-3.5 w-3.5" /> Popular</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.popular.slice(0, 6).map((movie) => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.trending.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><TrendingUp className="h-3.5 w-3.5" /> Trending</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.trending.slice(0, 6).map((movie) => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.underrated.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Eye className="h-3.5 w-3.5" /> Hidden Gems</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.underrated.slice(0, 6).map((movie) => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.tvSeries.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Tv className="h-3.5 w-3.5" /> TV Series</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.tvSeries.slice(0, 6).map((show) => (
              <div key={show.id} className="cursor-pointer" onClick={() => navigate(`/tv/${show.id}`)}>
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                  {show.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${show.poster_path}`} alt={show.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Tv className="h-6 w-6" /></div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium line-clamp-2">{show.name}</p>
                    <p className="text-white/70 text-[9px]">⭐ {show.vote_average.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── DETERMINE WHICH VIEW TO SHOW ───
  const showingHome = !quickMoodMode;

  return (
    <AppLayout hideHeader>
      <div className="min-h-screen transition-all duration-500">
        <div className="space-y-6 pt-4 pb-8">
          {/* Header */}
          <header className="px-4 space-y-2">
            <div className="flex items-center gap-3">
              {quickMoodMode && (
                <Button variant="ghost" size="icon" onClick={goHome} className="h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Lumina AI
                </motion.h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered emotional analysis & personalized recommendations
                </p>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {showingHome ? (
              <motion.div key="home-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                {/* ─── LUMINA AI CHAT INTERFACE ─── */}
                <section className="px-4 space-y-4">
                  <div className="glass-card p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Talk to Lumina
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tell me how you're feeling and I'll find the perfect content personalized just for you.
                    </p>

                    {chatHistory.length > 0 && (
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {chatHistory.map((chat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-3 rounded-xl text-sm",
                              chat.role === 'user' ? "bg-primary/20 ml-8" : "bg-secondary mr-4",
                              chat.isError && "border border-destructive/30"
                            )}
                          >
                            {chat.isError && (
                              <div className="flex items-center gap-1.5 text-destructive text-xs mb-1">
                                <AlertCircle className="h-3.5 w-3.5" /> Connection issue
                              </div>
                            )}
                            {chat.content}

                            {/* Preference badges */}
                            {chat.role === 'assistant' && chat.preferences && !chat.isError && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {chat.preferences.primary_emotion}
                                </span>
                                {chat.preferences.language && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                                    {chat.preferences.language}
                                  </span>
                                )}
                                {chat.preferences.genres?.slice(0, 3).map((g) => (
                                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{g}</span>
                                ))}
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {chat.preferences.tone}
                                </span>
                              </div>
                            )}

                            {/* Show Personalized Recommendations button */}
                            {chat.role === 'assistant' && chat.showRecommendations && chat.preferences && !chat.recommendations && !chat.isError && (
                              <Button
                                size="sm"
                                variant="default"
                                className="mt-3 w-full gap-2"
                                disabled={chat.isLoadingRecs}
                                onClick={() => handleShowRecommendations(index, chat.preferences!)}
                              >
                                {chat.isLoadingRecs ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                                    Finding personalized picks...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4" />
                                    Show Personalized Recommendations
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Inline recommendations */}
                            {chat.recommendations && renderInlineRecs(chat.recommendations)}
                          </motion.div>
                        ))}
                        {isAiThinking && (
                          <div className="p-3 rounded-xl bg-secondary mr-8">
                            <div className="flex items-center gap-2">
                              <div className="animate-pulse flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-sm text-muted-foreground">Lumina is thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., I feel sad and want Filipino comedy movies..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleChatSubmit()}
                        disabled={isAiThinking}
                      />
                      <Button size="icon" onClick={handleChatSubmit} disabled={isAiThinking || !chatInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </section>

                {/* ─── QUICK MOOD PICKS (completely separate, no AI) ─── */}
                <section className="px-4 space-y-4">
                  <div>
                    <h3 className="font-semibold">Quick Mood Picks (General Suggestions)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      These are general mood-based suggestions. For personalized recommendations, type how you're feeling above.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {moods.slice(0, 6).map((mood) => {
                      const Icon = mood.icon;
                      return (
                        <motion.button key={mood.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleQuickMoodSelect(mood.id)}
                          className={cn("glass-card flex flex-col items-center gap-2 p-4 transition-all", mood.color)}
                        >
                          <Icon className="h-8 w-8" />
                          <span className="text-sm font-medium text-foreground">{mood.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <details className="group">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Show more moods...</summary>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {moods.slice(6).map((mood) => {
                        const Icon = mood.icon;
                        return (
                          <motion.button key={mood.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => handleQuickMoodSelect(mood.id)}
                            className={cn("glass-card flex flex-col items-center gap-2 p-4 transition-all", mood.color)}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-xs font-medium text-foreground">{mood.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </details>
                </section>
              </motion.div>
            ) : (
              /* ─── QUICK MOOD RESULTS VIEW (no OpenAI, no Lumina) ─── */
              <motion.div key="quick-mood-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <section className="px-4">
                  <div className="glass-card p-4 flex items-center gap-3">
                    {currentMoodConfig && (
                      <>
                        <currentMoodConfig.icon className={cn("h-6 w-6", currentMoodConfig.color)} />
                        <div>
                          <h3 className="font-semibold">Browse by Mood: {currentMoodConfig.label}</h3>
                          <p className="text-sm text-muted-foreground">General library suggestions for this mood</p>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section className="px-4">
                  <Tabs value={quickMoodTab} onValueChange={(v) => setQuickMoodTab(v as typeof quickMoodTab)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="movies" className="gap-2"><Film className="h-4 w-4" /> Movies</TabsTrigger>
                      <TabsTrigger value="anime" className="gap-2"><Tv className="h-4 w-4" /> Anime</TabsTrigger>
                      <TabsTrigger value="manga" className="gap-2"><BookOpen className="h-4 w-4" /> Manga</TabsTrigger>
                    </TabsList>

                    <TabsContent value="movies" className="mt-4">
                      {isLoadingMovies ? (
                        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          {(moodMovies?.results.slice(0, 12) || []).map((movie, index) => (
                            <motion.div key={movie.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                              <MovieCard movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="anime" className="mt-4">
                      {isLoadingAnime ? (
                        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          {moodAnime?.slice(0, 12).map((anime, index) => (
                            <motion.div key={anime.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                              <AnimeCard anime={anime} size="sm" onClick={() => handleAnimeClick(anime)} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="manga" className="mt-4">
                      {isLoadingManga ? (
                        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          {moodManga?.slice(0, 12).map((manga, index) => (
                            <motion.div key={manga.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                              <AnimeCard anime={manga} size="sm" onClick={() => handleAnimeClick(manga)} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
