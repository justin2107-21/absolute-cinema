import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, 
  Frown, 
  Zap, 
  Heart, 
  PartyPopper, 
  Coffee,
  Sparkles,
  Send,
  ArrowLeft,
  Brain,
  Moon,
  CloudRain,
  Flame,
  Lightbulb,
  Meh,
  Search,
  Compass,
  HeartCrack,
  Battery
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getMoviesByMood } from '@/lib/tmdb';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { useMood } from '@/contexts/MoodContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Extended moods list
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

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  showRecommendations?: boolean;
  mood?: string;
}

export default function MoodMatch() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();
  const { setMood } = useMood();
  const { isAuthenticated, user } = useAuth();

  const { data: moodMovies, isLoading } = useQuery({
    queryKey: ['moodMovies', selectedMood],
    queryFn: () => getMoviesByMood(selectedMood!),
    enabled: !!selectedMood,
  });

  // Load existing conversation on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversation();
    }
  }, [isAuthenticated, user]);

  // Scroll to bottom when chat updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadConversation = async () => {
    if (!user) return;
    
    try {
      // Get most recent conversation
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversationId(conv.id);
        
        // Load messages
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (messages) {
          setChatHistory(messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            showRecommendations: m.show_recommendations || false,
          })));
        }

        if (conv.mood) {
          setSelectedMood(conv.mood);
          setMood(conv.mood as any);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (message: ChatMessage, convId: string) => {
    if (!user) return;
    
    try {
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        show_recommendations: message.showRecommendations || false,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const createOrUpdateConversation = async (mood?: string): Promise<string> => {
    if (!user) return '';
    
    try {
      if (conversationId) {
        // Update existing
        await supabase
          .from('chat_conversations')
          .update({ mood, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        return conversationId;
      } else {
        // Create new
        const { data } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, mood })
          .select()
          .single();
        
        if (data) {
          setConversationId(data.id);
          return data.id;
        }
      }
    } catch (error) {
      console.error('Error with conversation:', error);
    }
    return '';
  };

  const handleMoodSelect = async (moodId: string) => {
    setSelectedMood(moodId);
    setMood(moodId as any);
    
    if (isAuthenticated) {
      await createOrUpdateConversation(moodId);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      // Call the AI edge function
      const { data, error } = await supabase.functions.invoke('mood-chat', {
        body: { 
          message: chatInput,
          conversationHistory: chatHistory.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        showRecommendations: true,
        mood: data.mood,
      };

      setChatHistory((prev) => [...prev, aiMessage]);
      
      if (data.mood) {
        setSelectedMood(data.mood);
        setMood(data.mood as any);
      }

      // Save to database if authenticated
      if (isAuthenticated && user) {
        const convId = await createOrUpdateConversation(data.mood);
        await saveMessage(userMessage, convId);
        await saveMessage(aiMessage, convId);
      }
    } catch (error: any) {
      console.error('AI error:', error);
      
      // Handle rate limit errors
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (error.message?.includes('402')) {
        toast.error('AI service temporarily unavailable.');
      } else {
        // Fallback to simple mood detection
        const detectedMood = detectMoodFromText(chatInput);
        const fallbackMessage: ChatMessage = {
          role: 'assistant',
          content: getEmpathyResponse(detectedMood),
          showRecommendations: true,
          mood: detectedMood,
        };
        setChatHistory((prev) => [...prev, fallbackMessage]);
        setSelectedMood(detectedMood);
        setMood(detectedMood as any);
      }
    } finally {
      setIsAiThinking(false);
    }
  };

  const detectMoodFromText = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.match(/sad|down|upset|cry|depressed/)) return 'sad';
    if (lower.match(/stress|anxious|worried|overwhelm/)) return 'stressed';
    if (lower.match(/love|romantic|date|relationship/)) return 'romantic';
    if (lower.match(/excit|thrill|adventure|action/)) return 'excited';
    if (lower.match(/relax|calm|peace|chill/)) return 'relaxed';
    if (lower.match(/lonely|alone|isolated/)) return 'lonely';
    if (lower.match(/burned|exhausted|tired/)) return 'burned_out';
    if (lower.match(/nostalg|remember|childhood/)) return 'nostalgic';
    if (lower.match(/heartbr|breakup/)) return 'heartbroken';
    if (lower.match(/motiv|inspir/)) return 'motivated';
    if (lower.match(/bored/)) return 'bored';
    if (lower.match(/hope|optimis/)) return 'hopeful';
    if (lower.match(/curious|wonder/)) return 'curious';
    return 'happy';
  };

  const getEmpathyResponse = (mood: string): string => {
    const responses: Record<string, string> = {
      happy: "That's wonderful! Your positive energy deserves some feel-good movies to match.",
      sad: "I hear you. It's okay to feel this way. Let me find some movies that understand.",
      stressed: "I completely understand – stress can be overwhelming. Let me find something to help you unwind.",
      romantic: "Love is in the air! Let me find some heartwarming stories for you.",
      excited: "I love your energy! Let's channel that into some thrilling entertainment.",
      relaxed: "Perfect mood for some cozy viewing. Let me match your peaceful vibe.",
      lonely: "I'm here with you. Movies have a way of making us feel less alone.",
      anxious: "Take a deep breath. Let me find some calming films to ease your mind.",
      burned_out: "Burnout is real. You deserve something comforting that won't demand too much.",
      nostalgic: "There's something beautiful about looking back. Let me find that warm feeling.",
      heartbroken: "I'm so sorry. Whether you need a cry or a lift, I've got you.",
      motivated: "I love that drive! Let me find some inspiring stories.",
      bored: "Let's shake things up with something unexpected!",
      hopeful: "That optimism is beautiful. Let me match it with uplifting stories.",
      curious: "I love your sense of wonder! Let me find something thought-provoking.",
    };
    return responses[mood] || responses.happy;
  };

  const handleShowRecommendations = () => {
    // Scroll to recommendations
    document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentMoodConfig = moods.find((m) => m.id === selectedMood);

  return (
    <AppLayout>
      <div className="min-h-screen transition-all duration-500">
        <div className="space-y-6 pt-4 pb-8">
          {/* Header */}
          <header className="px-4 space-y-2">
            <div className="flex items-center gap-3">
              {selectedMood && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedMood(null);
                    setMood('default');
                  }}
                  className="h-10 w-10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold flex items-center gap-2"
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                  MoodMatch AI
                </motion.h1>
                <p className="text-sm text-muted-foreground">
                  Find movies that match how you feel
                </p>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {!selectedMood ? (
              <motion.div
                key="mood-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Chat Interface */}
                <section className="px-4 space-y-4">
                  <div className="glass-card p-4 space-y-4">
                    <h3 className="font-semibold">How are you feeling?</h3>
                    <p className="text-sm text-muted-foreground">
                      Describe your mood and I'll find the perfect movie for you
                    </p>
                    
                    {/* Chat history */}
                    {chatHistory.length > 0 && (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {chatHistory.map((chat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-3 rounded-xl text-sm",
                              chat.role === 'user'
                                ? "bg-primary/20 ml-8"
                                : "bg-secondary mr-8"
                            )}
                          >
                            {chat.content}
                            {chat.role === 'assistant' && chat.showRecommendations && (
                              <Button
                                size="sm"
                                className="mt-3 w-full"
                                onClick={handleShowRecommendations}
                              >
                                <Search className="h-4 w-4 mr-2" />
                                Show Recommended Movies
                              </Button>
                            )}
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
                              <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., I feel stressed and want something light..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isAiThinking && handleChatSubmit()}
                        disabled={isAiThinking}
                      />
                      <Button size="icon" onClick={handleChatSubmit} disabled={isAiThinking}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Mood Buttons */}
                <section className="px-4 space-y-4">
                  <h3 className="font-semibold">Or pick your mood</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {moods.slice(0, 6).map((mood) => {
                      const Icon = mood.icon;
                      return (
                        <motion.button
                          key={mood.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMoodSelect(mood.id)}
                          className={cn(
                            "glass-card flex flex-col items-center gap-2 p-4 transition-all",
                            mood.color
                          )}
                        >
                          <Icon className="h-8 w-8" />
                          <span className="text-sm font-medium text-foreground">
                            {mood.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {/* More moods */}
                  <details className="group">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      Show more moods...
                    </summary>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {moods.slice(6).map((mood) => {
                        const Icon = mood.icon;
                        return (
                          <motion.button
                            key={mood.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMoodSelect(mood.id)}
                            className={cn(
                              "glass-card flex flex-col items-center gap-2 p-4 transition-all",
                              mood.color
                            )}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-xs font-medium text-foreground">
                              {mood.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </details>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="movie-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
                id="recommendations"
              >
                {/* Selected mood indicator */}
                <section className="px-4">
                  <div className="glass-card p-4 flex items-center gap-3">
                    {currentMoodConfig && (
                      <>
                        <currentMoodConfig.icon className={cn("h-6 w-6", currentMoodConfig.color)} />
                        <div>
                          <h3 className="font-semibold">
                            Movies for when you're {currentMoodConfig.label.toLowerCase()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Curated picks to match your mood
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* Movie Results */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <section className="px-4">
                    <div className="grid grid-cols-3 gap-4">
                      {moodMovies?.results.slice(0, 12).map((movie, index) => (
                        <motion.div
                          key={movie.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <MovieCard
                            movie={movie}
                            size="sm"
                            onAddToWatchlist={addToWatchlist}
                            onMarkWatched={markAsWatched}
                            onClick={() => navigate(`/movie/${movie.id}`)}
                            isInWatchlist={isInWatchlist(movie.id)}
                            isWatched={isWatched(movie.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}