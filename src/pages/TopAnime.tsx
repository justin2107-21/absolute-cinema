import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, Star } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { getTop100Anime } from '@/lib/anilist';
import { anilistToUnified, getContentPath, getScoreEmoji, formatAnimeFormat, formatSeason } from '@/lib/unified-content';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TopAnime() {
  const navigate = useNavigate();

  const { data: page1 } = useQuery({
    queryKey: ['top100-anime-p1'],
    queryFn: () => getTop100Anime(1),
    staleTime: 1000 * 60 * 10,
  });

  const { data: page2 } = useQuery({
    queryKey: ['top100-anime-p2'],
    queryFn: () => getTop100Anime(2),
    staleTime: 1000 * 60 * 10,
  });

  const allAnime = [...(page1 || []), ...(page2 || [])].slice(0, 100);
  const unified = allAnime.map(anilistToUnified);

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <header className="px-4 pt-4 space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Top 100 Anime
              </h1>
              <p className="text-sm text-muted-foreground">Highest rated anime of all time</p>
            </div>
          </div>
        </header>

        <div className="px-4 space-y-2">
          {unified.map((content, index) => {
            const scorePercent = content.rating ? Math.round(content.rating * 10) : null;
            const emoji = getScoreEmoji(scorePercent);
            const format = formatAnimeFormat(content.format);
            const season = content.season && content.seasonYear
              ? `${formatSeason(content.season)} ${content.seasonYear}`
              : content.seasonYear?.toString() || '';

            return (
              <motion.div
                key={content.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.015 }}
                onClick={() => navigate(getContentPath(content))}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm font-bold text-primary w-8 text-right shrink-0">#{index + 1}</span>
                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {content.poster && (
                    <img src={content.poster} alt={content.title} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{content.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {scorePercent && <span className="font-semibold text-foreground">{scorePercent}%</span>}
                    <span>{emoji}</span>
                    <span>•</span>
                    <span>{format}</span>
                    {season && <><span>•</span><span>{season}</span></>}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {unified.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
