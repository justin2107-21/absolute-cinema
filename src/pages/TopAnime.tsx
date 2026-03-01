import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { UnifiedCard } from '@/components/content/UnifiedCard';
import { getTop100Anime } from '@/lib/anilist';
import { anilistToUnified, getContentPath } from '@/lib/unified-content';
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

        <div className="px-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {unified.map((content, index) => (
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="relative"
              >
                <div className="absolute -top-1 -left-1 z-10 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                  {index + 1}
                </div>
                <UnifiedCard content={content} size="sm" onClick={() => navigate(getContentPath(content))} />
              </motion.div>
            ))}
          </div>
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
