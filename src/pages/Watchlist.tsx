import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Check, Trash2, Star, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useWatchlist, getWatchlistItemPath } from '@/hooks/useWatchlist';
import type { WatchlistItem, WatchedItem } from '@/hooks/useWatchlist';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type Tab = 'watchlist' | 'watched';

export default function Watchlist() {
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const navigate = useNavigate();
  const {
    watchlist,
    watched,
    removeFromWatchlist,
    markAsWatched,
    removeFromWatched,
  } = useWatchlist();

  const items: (WatchlistItem | WatchedItem)[] = activeTab === 'watchlist' ? watchlist : watched;

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        <header className="px-4 space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            My Movies
          </motion.h1>

          <div className="flex gap-2">
            <Button
              variant={activeTab === 'watchlist' ? 'default' : 'ghost'}
              className="flex-1 gap-2"
              onClick={() => setActiveTab('watchlist')}
            >
              <Bookmark className="h-4 w-4" />
              Watchlist ({watchlist.length})
            </Button>
            <Button
              variant={activeTab === 'watched' ? 'default' : 'ghost'}
              className="flex-1 gap-2"
              onClick={() => setActiveTab('watched')}
            >
              <Check className="h-4 w-4" />
              Watched ({watched.length})
            </Button>
          </div>
        </header>

        <section className="px-4">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                {activeTab === 'watchlist' ? (
                  <>
                    <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No movies in watchlist</h3>
                    <p className="text-sm text-muted-foreground">
                      Start adding movies you want to watch
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/search')}>
                      Browse Movies
                    </Button>
                  </>
                ) : (
                  <>
                    <Check className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No movies watched yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Mark movies as watched to track your history
                    </p>
                  </>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const isWatchedItem = 'watchedAt' in item;
                  const rating = item.voteAverage?.toFixed(1);
                  const detailPath = getWatchlistItemPath(item);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card p-3 flex gap-4"
                    >
                      <div
                        className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(detailPath)}
                      >
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-secondary flex items-center justify-center">
                            <span className="text-xs text-muted-foreground text-center p-1">
                              {item.title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3
                            className="font-semibold line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(detailPath)}
                          >
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{item.releaseDate?.split('-')[0]}</span>
                            {rating && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-accent text-accent" />
                                  <span>{rating}</span>
                                </div>
                              </>
                            )}
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary capitalize">
                              {item.mediaType}
                            </span>
                          </div>
                          {isWatchedItem && (item as WatchedItem).watchedAt && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Watched {new Date((item as WatchedItem).watchedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-2">
                          {activeTab === 'watchlist' ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1 h-8"
                                onClick={() => markAsWatched(item)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Watched
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => removeFromWatchlist(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => removeFromWatched(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </AppLayout>
  );
}
