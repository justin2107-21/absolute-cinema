import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface EpisodeSelectorProps {
  contentId: string;
  contentType: 'tv' | 'anime';
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  onEpisodeChange: (season: number, episode: number) => void;
}

export function EpisodeSelector({
  currentSeason,
  currentEpisode,
  totalSeasons,
  onEpisodeChange,
}: EpisodeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generate episode numbers (assume 20 episodes per season for now)
  const episodesPerSeason = 20;
  const episodes = Array.from({ length: episodesPerSeason }, (_, i) => i + 1);
  const seasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);

  return (
    <section className="px-4 py-4 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Episodes</h3>
        <Select
          value={currentSeason.toString()}
          onValueChange={(v) => onEpisodeChange(parseInt(v), 1)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s} value={s.toString()}>
                Season {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className={cn("transition-all", isExpanded ? "h-64" : "h-24")}>
        <div className="grid grid-cols-5 gap-2">
          {episodes.map((ep) => (
            <Button
              key={ep}
              variant={currentEpisode === ep ? "default" : "outline"}
              size="sm"
              className="h-10"
              onClick={() => onEpisodeChange(currentSeason, ep)}
            >
              {ep}
            </Button>
          ))}
        </div>
      </ScrollArea>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        {isExpanded ? 'Show Less' : 'Show More'}
      </Button>
    </section>
  );
}
