import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smile, Frown, Zap, Heart, PartyPopper, Coffee, Sparkles, Send, ArrowLeft, Brain,
  Moon, CloudRain, Flame, Lightbulb, Meh, Search, Compass, HeartCrack, Battery,
  Film, Tv, BookOpen, TrendingUp, Star, Eye, AlertCircle, Pencil, Trash2,
  Paperclip, Image as ImageIcon, MoreVertical, X, Play, List, Plus
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getMoviesByMood } from '@/lib/tmdb';
import { getAnimeByMood, getMangaByMood, type AniListMedia } from '@/lib/anilist';
import { getMoodRecommendations, type MoodPreferences, type MoodRecommendations } from '@/lib/moodRecommendations';
import { useWatchlist, type WatchlistItem } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { useMood } from '@/contexts/MoodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── QUICK MOOD PICKS CONFIG (static, no AI) ───
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

// ─── SANITIZE AI OUTPUT ───
function sanitizeAiContent(text: string): string {
  // Remove tool call XML tags like <search_recommendations_action>...</search_recommendations_action>
  let cleaned = text.replace(/<\/?[a-z_]+(?:\s[^>]*)?>(?:\{[^}]*\})?/gi, '');
  // Remove markdown bold/italic/heading markers
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

// ─── TMDB METADATA TYPES ───
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
  mediaType: 'movie' | 'tv';
  runtime?: number;
}

// ─── ANILIST METADATA TYPE ───
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

// ─── LUMINA AI CHAT MESSAGE TYPE ───
interface LuminaMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  showRecommendations?: boolean;
  preferences?: MoodPreferences;
  recommendations?: MoodRecommendations | null;
  isLoadingRecs?: boolean;
  isError?: boolean;
  imageUrl?: string;
  isEditing?: boolean;
  identifiedTitle?: string;
  identifiedType?: 'movie' | 'tv' | 'anime' | 'manga';
  tmdbMetadata?: TmdbMetadata | null;
  anilistMetadata?: AniListMetadata | null;
  character?: string | null;
  genre?: string | null;
  year?: string | null;
  season?: string | null;
  episode?: string | null;
  episodeTitle?: string | null;
  timestamp?: string | null;
  recsVisible?: boolean;
}

export default function MoodMatch() {
  // ─── HARD STATE SEPARATION ───
  const [quickMoodMode, setQuickMoodMode] = useState(false);
  const [quickMoodId, setQuickMoodId] = useState<string | null>(null);
  const [quickMoodTab, setQuickMoodTab] = useState<'movies' | 'anime' | 'manga'>('movies');

  // Lumina AI state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<LuminaMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();
  const { setMood } = useMood();
  const { isAuthenticated, user } = useAuth();

  // ─── QUICK MOOD QUERIES ───
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
          setChatHistory(messages.map((m) => {
            const meta = (m.recommendations as Record<string, any>) || {};
            return {
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              showRecommendations: m.show_recommendations || false,
              preferences: meta.preferences as MoodPreferences | undefined,
              imageUrl: meta.imageUrl || undefined,
              identifiedTitle: meta.identifiedTitle || undefined,
              identifiedType: meta.identifiedType || undefined,
              tmdbMetadata: meta.tmdbMetadata || undefined,
            };
          }));
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (message: LuminaMessage, convId: string) => {
    if (!user) return;
    try {
      const metadata: Record<string, any> = {};
      if (message.preferences) Object.assign(metadata, { preferences: message.preferences });
      if (message.imageUrl) metadata.imageUrl = message.imageUrl;
      if (message.identifiedTitle) metadata.identifiedTitle = message.identifiedTitle;
      if (message.identifiedType) metadata.identifiedType = message.identifiedType;
      if (message.tmdbMetadata) metadata.tmdbMetadata = message.tmdbMetadata;

      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        show_recommendations: message.showRecommendations || false,
        recommendations: Object.keys(metadata).length > 0 ? (metadata as any) : null,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const createOrUpdateConversation = async (): Promise<string> => {
    if (!user) return '';
    try {
      if (conversationId) {
        await supabase.from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        return conversationId;
      } else {
        const { data } = await supabase.from('chat_conversations')
          .insert({ user_id: user.id }).select().single();
        if (data) { setConversationId(data.id); return data.id; }
      }
    } catch (error) {
      console.error('Error with conversation:', error);
    }
    return '';
  };

  const handleQuickMoodSelect = (moodId: string) => {
    setQuickMoodId(moodId);
    setQuickMoodMode(true);
    setMood(moodId as any);
  };

  const handleShowRecommendations = async (messageIndex: number, prefs: MoodPreferences) => {
    setChatHistory(prev => prev.map((m, i) =>
      i === messageIndex ? { ...m, isLoadingRecs: true } : m
    ));
    try {
      const recs = await getMoodRecommendations(prefs);
      setChatHistory(prev => prev.map((m, i) =>
        i === messageIndex ? { ...m, recommendations: recs, isLoadingRecs: false, showRecommendations: false, recsVisible: true } : m
      ));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to load recommendations.');
      setChatHistory(prev => prev.map((m, i) =>
        i === messageIndex ? { ...m, isLoadingRecs: false } : m
      ));
    }
  };

  const toggleRecsVisibility = (messageIndex: number) => {
    setChatHistory(prev => prev.map((m, i) =>
      i === messageIndex ? { ...m, recsVisible: !m.recsVisible } : m
    ));
  };

  // ─── IMAGE HANDLING (staged, not auto-sent) ───
  const stageImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage({ file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const removePendingImage = () => setPendingImage(null);

  const sendImageMessage = async (base64: string, text: string) => {
    const userMessage: LuminaMessage = {
      role: 'user',
      content: text || 'What movie/anime/show is this from?',
      imageUrl: base64,
    };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');
    setPendingImage(null);
    setIsAiThinking(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          imageUrl: base64,
          message: text || 'What movie/anime/show is this from?',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Image analysis failed');

      const aiMessage: LuminaMessage = {
        role: 'assistant',
        content: sanitizeAiContent(data.message),
        identifiedTitle: data.identifiedTitle || undefined,
        identifiedType: data.identifiedType || undefined,
        tmdbMetadata: data.tmdbMetadata || undefined,
      };
      setChatHistory(prev => [...prev, aiMessage]);

      if (isAuthenticated && user) {
        const convId = await createOrUpdateConversation();
        await saveMessage(userMessage, convId);
        await saveMessage(aiMessage, convId);
      }
    } catch (error: any) {
      console.error('Image analysis error:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: "I couldn't analyze the image right now. Please try again.",
        isError: true,
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) stageImage(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.[0]?.type.startsWith('image/')) {
      stageImage(files[0]);
    }
  };

  // ─── MESSAGE ACTIONS ───
  const handleEditMessage = (index: number) => {
    setEditingIndex(index);
    setEditContent(chatHistory[index].content);
  };

  const handleSaveEdit = async (index: number) => {
    setChatHistory(prev => prev.map((m, i) =>
      i === index ? { ...m, content: editContent } : m
    ));
    setEditingIndex(null);
    setEditContent('');
  };

  const handleDeleteMessage = (index: number) => {
    setChatHistory(prev => prev.filter((_, i) => i !== index));
  };

  // ─── LUMINA AI CHAT ───
  const handleChatSubmit = async () => {
    // If there's a pending image, send it
    if (pendingImage) {
      await sendImageMessage(pendingImage.preview, chatInput.trim());
      return;
    }

    if (!chatInput.trim()) return;

    const userMessage: LuminaMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, userMessage]);
    const inputText = chatInput;
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
          message: inputText,
          conversationHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      const hasPrefs = data.hasRecommendations && !!data.preferences;

      const aiMessage: LuminaMessage = {
        role: 'assistant',
        content: sanitizeAiContent(data.message),
        showRecommendations: false, // We'll auto-fetch instead
        preferences: data.preferences || undefined,
      };

      setChatHistory(prev => [...prev, aiMessage]);

      // Persist
      if (isAuthenticated && user) {
        const convId = await createOrUpdateConversation();
        await saveMessage(userMessage, convId);
        await saveMessage(aiMessage, convId);
      }

      // Auto-fetch recommendations if AI detected recommendation intent
      if (hasPrefs && data.preferences) {
        const newIndex = chatHistory.length + 1; // +1 for user msg already added
        // Small delay for UX
        setTimeout(() => {
          handleShowRecommendations(newIndex, data.preferences);
        }, 500);
      }
    } catch (error: any) {
      console.error('Lumina AI error:', error);
      const isRateLimit = error?.message === 'RATE_LIMIT';
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: isRateLimit
          ? "I'm experiencing high demand right now. Please wait a moment and try again!"
          : "I'm having trouble connecting right now. Please try again in a moment.",
        isError: true,
      }]);
      toast.error(isRateLimit ? 'Rate limit reached.' : 'Connection issue.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAnimeClick = (anime: AniListMedia) => navigate(`/anime/${anime.id}`);

  const goHome = () => {
    setQuickMoodMode(false);
    setQuickMoodId(null);
    setMood('default');
  };

  const currentMoodConfig = moods.find(m => m.id === quickMoodId);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ─── INLINE RECS RENDERER ───
  const renderInlineRecs = (recs: MoodRecommendations) => (
    <div className="space-y-5 mt-3">
      {recs.anime && recs.anime.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Play className="h-3.5 w-3.5" /> Anime</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.anime.slice(0, 6).map(a => (
              <AnimeCard key={a.id} anime={a} size="sm" onClick={() => handleAnimeClick(a)} />
            ))}
          </div>
        </div>
      )}
      {recs.popular.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Star className="h-3.5 w-3.5" /> {recs.trending.length === 0 && recs.underrated.length === 0 ? 'Recommendations' : 'Popular'}</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.popular.slice(0, 6).map(movie => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.trending.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><TrendingUp className="h-3.5 w-3.5" /> Trending</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.trending.slice(0, 6).map(movie => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.underrated.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Eye className="h-3.5 w-3.5" /> Hidden Gems</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.underrated.slice(0, 6).map(movie => (
              <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
            ))}
          </div>
        </div>
      )}
      {recs.tvSeries.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-1.5 text-xs text-primary"><Tv className="h-3.5 w-3.5" /> TV Series</h4>
          <div className="grid grid-cols-3 gap-2">
            {recs.tvSeries.slice(0, 6).map(show => (
              <div key={show.id} className="cursor-pointer" onClick={() => navigate(`/tv/${show.id}`)}>
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                  {show.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${show.poster_path}`} alt={show.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Tv className="h-6 w-6" /></div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-foreground text-[10px] font-medium line-clamp-2">{show.name}</p>
                    <p className="text-muted-foreground text-[9px]">⭐ {show.vote_average.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── COMPACT METADATA RENDERER (no full episode guide) ───
  const renderTmdbMetadata = (meta: TmdbMetadata) => (
    <div className="mt-3 text-sm">
      <div className="bg-background/50 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>⭐ {meta.voteAverage.toFixed(1)}</span>
          {meta.mediaType === 'tv' && meta.totalSeasons > 0 && (
            <>
              <span>{meta.totalSeasons} Season{meta.totalSeasons > 1 ? 's' : ''}</span>
              <span>{meta.totalEpisodes} Episodes</span>
            </>
          )}
          {meta.mediaType === 'movie' && meta.runtime && <span>{meta.runtime} min</span>}
          <span>{meta.status}</span>
        </div>
      </div>
    </div>
  );

  // ─── ACTION BUTTONS FOR IDENTIFIED CONTENT ───
  const renderIdentifiedActions = (msg: LuminaMessage) => {
    if (!msg.identifiedTitle) return null;
    return (
      <div className="space-y-0">
        {/* TMDB metadata cards */}
        {msg.tmdbMetadata && renderTmdbMetadata(msg.tmdbMetadata)}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => {
              const query = `recommend ${msg.identifiedType === 'anime' ? 'anime' : 'movies'} similar to ${msg.identifiedTitle}`;
              setChatInput(query);
              setTimeout(() => handleChatSubmit(), 100);
            }}
          >
            <Play className="h-3 w-3" /> Similar {msg.identifiedType === 'anime' ? 'Anime' : 'Titles'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (msg.identifiedType === 'anime' && msg.tmdbMetadata) {
                // Search AniList page for anime
                navigate(`/search?q=${encodeURIComponent(msg.identifiedTitle!)}`);
              } else if (msg.tmdbMetadata) {
                navigate(`/${msg.tmdbMetadata.mediaType === 'tv' ? 'tv' : 'movie'}/${msg.tmdbMetadata.tmdbId}`);
              } else {
                navigate(`/search?q=${encodeURIComponent(msg.identifiedTitle!)}`);
              }
            }}
          >
            <Search className="h-3 w-3" /> View Details
          </Button>
          {msg.tmdbMetadata && msg.tmdbMetadata.mediaType === 'tv' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => {
                const query = `Tell me about the episodes of ${msg.identifiedTitle}`;
                setChatInput(query);
              }}
            >
              <List className="h-3 w-3" /> Episode Info
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => {
              if (msg.identifiedType === 'anime' && msg.tmdbMetadata) {
                // For anime, add as AniList source so it navigates correctly
                addToWatchlist({
                  id: `anilist-anime-${msg.tmdbMetadata.tmdbId}`,
                  source: 'anilist',
                  mediaType: 'anime',
                  sourceId: msg.tmdbMetadata.tmdbId,
                  title: msg.tmdbMetadata.title,
                  posterUrl: msg.tmdbMetadata.posterPath
                    ? `https://image.tmdb.org/t/p/w500${msg.tmdbMetadata.posterPath}`
                    : null,
                  voteAverage: msg.tmdbMetadata.voteAverage,
                } as any);
                toast.success(`Added "${msg.tmdbMetadata.title}" to watchlist!`);
              } else if (msg.tmdbMetadata) {
                const item: WatchlistItem = {
                  id: `tmdb-${msg.tmdbMetadata.mediaType}-${msg.tmdbMetadata.tmdbId}`,
                  source: 'tmdb',
                  mediaType: msg.tmdbMetadata.mediaType === 'tv' ? 'tv' : 'movie',
                  sourceId: msg.tmdbMetadata.tmdbId,
                  title: msg.tmdbMetadata.title,
                  posterUrl: msg.tmdbMetadata.posterPath
                    ? `https://image.tmdb.org/t/p/w500${msg.tmdbMetadata.posterPath}`
                    : null,
                  voteAverage: msg.tmdbMetadata.voteAverage,
                  releaseDate: msg.tmdbMetadata.firstAirDate || undefined,
                };
                addToWatchlist(item);
                toast.success(`Added "${msg.tmdbMetadata.title}" to watchlist!`);
              }
            }}
          >
            <Plus className="h-3 w-3" /> Add to Watchlist
          </Button>
        </div>
      </div>
    );
  };

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
                  Your personal entertainment companion
                </p>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {showingHome ? (
              <motion.div key="home-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                {/* ─── LUMINA AI FULL CHAT INTERFACE ─── */}
                <section className="px-4">
                  <div
                    className={cn(
                      "rounded-2xl border border-border bg-card/80 backdrop-blur-sm flex flex-col transition-all",
                      isDragOver && "ring-2 ring-primary border-primary"
                    )}
                    style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                  >
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Lumina</p>
                        <p className="text-xs text-muted-foreground">Online • Ready to help</p>
                      </div>
                    </div>

                    {/* Messages area */}
                    <ScrollArea className="flex-1 px-4 py-4">
                      <div className="space-y-4 max-w-2xl mx-auto">
                        {/* Welcome message */}
                        {chatHistory.length === 0 && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                            <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                              <p className="text-sm leading-relaxed">
                                Hello! 👋 I'm <strong>Lumina</strong>, your entertainment companion. I can help you:
                              </p>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm">🎬 Get personalized recommendations</p>
                                <p className="text-sm">💬 Chat about movies, shows & anime</p>
                                <p className="text-sm">📸 Identify scenes from screenshots</p>
                                <p className="text-sm">🔎 Search for specific titles</p>
                              </div>
                              <p className="text-sm mt-2 text-muted-foreground">What would you like to do?</p>
                            </div>
                          </motion.div>
                        )}

                        {chatHistory.map((chat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className={cn(
                              "flex gap-3 group",
                              chat.role === 'user' ? "flex-row-reverse" : ""
                            )}
                          >
                            {/* Avatar */}
                            {chat.role === 'assistant' && (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                              </div>
                            )}

                            <div className={cn(
                              "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                              chat.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-tr-md"
                                : "bg-secondary rounded-tl-md",
                              chat.isError && "border border-destructive/30"
                            )}>
                              {chat.isError && (
                                <div className="flex items-center gap-1.5 text-destructive text-xs mb-1">
                                  <AlertCircle className="h-3.5 w-3.5" /> Connection issue
                                </div>
                              )}

                              {/* Image attachment - persisted */}
                              {chat.imageUrl && (
                                <div className="mb-2 rounded-lg overflow-hidden">
                                  <img src={chat.imageUrl} alt="Uploaded" className="max-h-48 rounded-lg object-contain" />
                                </div>
                              )}

                              {/* Editable content */}
                              {editingIndex === index ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[60px] bg-background/50 text-foreground"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleSaveEdit(index)}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap leading-relaxed">{chat.content}</p>
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
                                      Finding picks...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="h-4 w-4" />
                                      Show Personalized Recommendations
                                    </>
                                  )}
                                </Button>
                              )}

                              {/* Loading recs indicator */}
                              {chat.isLoadingRecs && (
                                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                  Finding recommendations...
                                </div>
                              )}

                              {/* VIEW RECOMMENDED toggle button */}
                              {chat.recommendations && !chat.recsVisible && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="mt-3 w-full gap-2"
                                  onClick={() => toggleRecsVisibility(index)}
                                >
                                  <Film className="h-4 w-4" />
                                  View Recommended
                                </Button>
                              )}

                              {/* Inline recommendations (collapsible) */}
                              {chat.recommendations && chat.recsVisible && (
                                <>
                                  {renderInlineRecs(chat.recommendations)}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-3 w-full gap-2 text-xs"
                                    onClick={() => toggleRecsVisibility(index)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Hide Recommendations
                                  </Button>
                                </>
                              )}

                              {/* Action buttons for identified content */}
                              {chat.role === 'assistant' && renderIdentifiedActions(chat)}

                              {/* Message actions (edit/delete) */}
                              {chat.role === 'user' && editingIndex !== index && (
                                <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                      <DropdownMenuItem onClick={() => handleEditMessage(index)}>
                                        <Pencil className="h-3 w-3 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteMessage(index)} className="text-destructive">
                                        <Trash2 className="h-3 w-3 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {isAiThinking && (
                          <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                            <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-sm text-muted-foreground">Lumina is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {isDragOver && (
                          <div className="flex items-center justify-center py-8 border-2 border-dashed border-primary rounded-xl bg-primary/5">
                            <div className="text-center">
                              <ImageIcon className="h-8 w-8 text-primary mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Drop image to analyze</p>
                            </div>
                          </div>
                        )}

                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Pending image preview */}
                    {pendingImage && (
                      <div className="px-4 pt-2 border-t border-border">
                        <div className="relative inline-block">
                          <img src={pendingImage.preview} alt="Preview" className="h-20 rounded-lg object-contain border border-border" />
                          <button
                            onClick={removePendingImage}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Input area */}
                    <div className="px-4 py-3 border-t border-border">
                      <div className="flex items-end gap-2 max-w-2xl mx-auto">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) stageImage(file);
                            e.target.value = '';
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <Textarea
                          ref={textareaRef}
                          placeholder="Ask Lumina anything about movies, shows, anime..."
                          value={chatInput}
                          onChange={handleTextareaChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isAiThinking) {
                              e.preventDefault();
                              handleChatSubmit();
                            }
                          }}
                          onPaste={handlePaste}
                          disabled={isAiThinking}
                          className="min-h-[44px] max-h-[120px] resize-none rounded-xl bg-secondary border-0 focus-visible:ring-1"
                          rows={1}
                        />
                        <Button
                          size="icon"
                          className="h-10 w-10 flex-shrink-0 rounded-xl"
                          onClick={handleChatSubmit}
                          disabled={isAiThinking || (!chatInput.trim() && !pendingImage)}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ─── QUICK MOOD PICKS (completely separate, no AI) ─── */}
                <section className="px-4 space-y-4">
                  <div>
                    <h3 className="font-semibold">Quick Mood Picks (General Suggestions)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      These are general mood-based suggestions. For personalized recommendations, chat with Lumina above.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {moods.slice(0, 6).map(mood => {
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
                      {moods.slice(6).map(mood => {
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
              /* ─── QUICK MOOD RESULTS VIEW ─── */
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

                <section className="px-4 space-y-4">
                  <Tabs value={quickMoodTab} onValueChange={v => setQuickMoodTab(v as any)}>
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="movies" className="gap-1.5"><Film className="h-4 w-4" /> Movies</TabsTrigger>
                      <TabsTrigger value="anime" className="gap-1.5"><Tv className="h-4 w-4" /> Anime</TabsTrigger>
                      <TabsTrigger value="manga" className="gap-1.5"><BookOpen className="h-4 w-4" /> Manga</TabsTrigger>
                    </TabsList>

                    <TabsContent value="movies" className="mt-4">
                      {isLoadingMovies ? (
                        <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />)}</div>
                      ) : moodMovies?.results?.length ? (
                        <div className="grid grid-cols-2 gap-4">
                          {moodMovies.results.map(movie => (
                            <MovieCard key={movie.id} movie={movie} size="sm" onAddToWatchlist={addToWatchlist} onMarkWatched={markAsWatched} onClick={() => navigate(`/movie/${movie.id}`)} isInWatchlist={isInWatchlist(movie.id)} isWatched={isWatched(movie.id)} />
                          ))}
                        </div>
                      ) : <p className="text-center text-muted-foreground py-8">No movies found for this mood.</p>}
                    </TabsContent>

                    <TabsContent value="anime" className="mt-4">
                      {isLoadingAnime ? (
                        <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />)}</div>
                      ) : moodAnime?.length ? (
                        <div className="grid grid-cols-2 gap-4">
                          {moodAnime.map(anime => <AnimeCard key={anime.id} anime={anime} onClick={() => handleAnimeClick(anime)} />)}
                        </div>
                      ) : <p className="text-center text-muted-foreground py-8">No anime found for this mood.</p>}
                    </TabsContent>

                    <TabsContent value="manga" className="mt-4">
                      {isLoadingManga ? (
                        <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />)}</div>
                      ) : moodManga?.length ? (
                        <div className="grid grid-cols-2 gap-4">
                          {moodManga.map(manga => <AnimeCard key={manga.id} anime={manga} onClick={() => navigate(`/anime/${manga.id}`)} />)}
                        </div>
                      ) : <p className="text-center text-muted-foreground py-8">No manga found for this mood.</p>}
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
