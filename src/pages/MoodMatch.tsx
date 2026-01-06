import { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MovieCard } from '@/components/movies/MovieCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getMoviesByMood, moodToGenres } from '@/lib/tmdb';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const moods = [
  { id: 'happy', label: 'Happy', icon: Smile, color: 'text-mood-happy', bgClass: 'mood-gradient-happy', ring: 'ring-mood-happy' },
  { id: 'sad', label: 'Sad', icon: Frown, color: 'text-mood-sad', bgClass: 'mood-gradient-sad', ring: 'ring-mood-sad' },
  { id: 'stressed', label: 'Stressed', icon: Zap, color: 'text-mood-stressed', bgClass: 'mood-gradient-stressed', ring: 'ring-mood-stressed' },
  { id: 'romantic', label: 'Romantic', icon: Heart, color: 'text-mood-romantic', bgClass: 'mood-gradient-romantic', ring: 'ring-mood-romantic' },
  { id: 'excited', label: 'Excited', icon: PartyPopper, color: 'text-mood-excited', bgClass: 'mood-gradient-excited', ring: 'ring-mood-excited' },
  { id: 'relaxed', label: 'Relaxed', icon: Coffee, color: 'text-mood-relaxed', bgClass: 'mood-gradient-relaxed', ring: 'ring-mood-relaxed' },
];

export default function MoodMatch() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; message: string }[]>([]);
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();

  const { data: moodMovies, isLoading } = useQuery({
    queryKey: ['moodMovies', selectedMood],
    queryFn: () => getMoviesByMood(selectedMood!),
    enabled: !!selectedMood,
  });

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatHistory((prev) => [...prev, { role: 'user', message: userMessage }]);
    setChatInput('');

    // Simple mood detection from text
    const lowerMessage = userMessage.toLowerCase();
    let detectedMood = 'happy';

    if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('upset')) {
      detectedMood = 'sad';
    } else if (lowerMessage.includes('stress') || lowerMessage.includes('anxious') || lowerMessage.includes('tired')) {
      detectedMood = 'stressed';
    } else if (lowerMessage.includes('love') || lowerMessage.includes('romantic') || lowerMessage.includes('date')) {
      detectedMood = 'romantic';
    } else if (lowerMessage.includes('excit') || lowerMessage.includes('energetic') || lowerMessage.includes('adventure')) {
      detectedMood = 'excited';
    } else if (lowerMessage.includes('relax') || lowerMessage.includes('calm') || lowerMessage.includes('chill')) {
      detectedMood = 'relaxed';
    } else if (lowerMessage.includes('happy') || lowerMessage.includes('fun') || lowerMessage.includes('laugh')) {
      detectedMood = 'happy';
    }

    const moodLabel = moods.find((m) => m.id === detectedMood)?.label;
    
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'ai',
          message: `I sense you're feeling ${moodLabel?.toLowerCase()}! I've found some perfect movies to match your mood. Here are my recommendations:`,
        },
      ]);
      setSelectedMood(detectedMood);
    }, 1000);
  };

  const currentMoodConfig = moods.find((m) => m.id === selectedMood);

  return (
    <AppLayout>
      <div className={cn(
        "min-h-screen transition-all duration-500",
        currentMoodConfig?.bgClass
      )}>
        <div className="space-y-6 pt-4 pb-8">
          {/* Header */}
          <header className="px-4 space-y-2">
            <div className="flex items-center gap-3">
              {selectedMood && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMood(null)}
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
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {chatHistory.map((chat, index) => (
                          <div
                            key={index}
                            className={cn(
                              "p-3 rounded-xl text-sm",
                              chat.role === 'user'
                                ? "bg-primary/20 ml-8"
                                : "bg-secondary mr-8"
                            )}
                          >
                            {chat.message}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., I feel stressed and want something light..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      />
                      <Button size="icon" onClick={handleChatSubmit}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Mood Buttons */}
                <section className="px-4 space-y-4">
                  <h3 className="font-semibold">Or pick your mood</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {moods.map((mood) => {
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
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="movie-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
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
