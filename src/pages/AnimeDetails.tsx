import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Play, BookOpen, Calendar, Tv, Plus, Check, Share2, Clock, Heart, Users, TrendingUp, Hash } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/comments/CommentSection';
import { getAniListDetails, type AniListDetailMedia } from '@/lib/anilist';
import { useWatchlist } from '@/hooks/useWatchlist';
import { toast } from 'sonner';
import type { Movie } from '@/lib/tmdb';

function animeToMovie(anime: AniListDetailMedia): Movie {
  return {
    id: anime.id + 900000,
    title: anime.title.english || anime.title.romaji,
    overview: anime.description?.replace(/<[^>]*>/g, '') || '',
    poster_path: null,
    backdrop_path: null,
    release_date: anime.startDate?.year ? `${anime.startDate.year}-01-01` : '',
    vote_average: anime.averageScore ? anime.averageScore / 10 : 0,
    vote_count: anime.popularity || 0,
    genre_ids: [],
    popularity: anime.popularity || 0,
  };
}

function formatDate(d: { year: number | null; month: number | null; day: number | null } | null): string {
  if (!d?.year) return 'TBA';
  const parts = [d.year];
  if (d.month) parts.push(d.month);
  if (d.day) parts.push(d.day);
  return parts.join('/');
}

function formatStatus(s: string): string {
  const map: Record<string, string> = {
    FINISHED: 'Finished', RELEASING: 'Airing', NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled', HIATUS: 'Hiatus',
  };
  return map[s] || s;
}

function formatSource(s: string | null): string {
  if (!s) return 'Unknown';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const STATUS_COLORS: Record<string, string> = {
  CURRENT: 'bg-green-500', COMPLETED: 'bg-blue-500', PLANNING: 'bg-purple-500',
  DROPPED: 'bg-red-500', PAUSED: 'bg-yellow-500',
};

export default function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToWatchlist, markAsWatched, isInWatchlist, isWatched } = useWatchlist();

  const { data: anime, isLoading, error } = useQuery({
    queryKey: ['anilist-detail', id],
    queryFn: async () => {
      const data = await getAniListDetails(Number(id));
      if (!data) throw new Error('Failed to load AniList details');
      return data;
    },
    enabled: !!id,
    retry: 2,
  });

  if (isLoading) {
    return (
      <AppLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!anime || error) {
    return (
      <AppLayout hideNav>
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <p className="text-muted-foreground">Could not load this content. Please try again.</p>
          <div className="flex gap-2">
            <Button onClick={() => navigate(-1)}>Go Back</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const movieProxy = animeToMovie(anime);
  const inWatchlist = isInWatchlist(movieProxy.id);
  const watched = isWatched(movieProxy.id);
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const trailerUrl = anime.trailer?.site === 'youtube' ? `https://www.youtube.com/embed/${anime.trailer.id}` : null;
  const animationStudios = anime.studios?.nodes?.filter(s => s.isAnimationStudio) || [];
  const producers = anime.studios?.nodes?.filter(s => !s.isAnimationStudio) || [];
  const relatedAnime = anime.relations?.edges?.slice(0, 12) || [];
  const recommendations = anime.recommendations?.nodes?.filter(n => n.mediaRecommendation).slice(0, 10) || [];
  const characters = anime.characters?.edges?.slice(0, 12) || [];
  const staff = anime.staff?.edges?.slice(0, 10) || [];
  const statusDist = anime.stats?.statusDistribution || [];
  const totalStatusCount = statusDist.reduce((s, d) => s + d.amount, 0);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Check out ${title}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  return (
    <AppLayout hideNav>
      <div className="pb-8">
        {/* Hero */}
        <header className="relative min-h-[55vh]">
          <div className="absolute inset-0">
            {anime.bannerImage ? (
              <img src={anime.bannerImage} alt={title} className="h-full w-full object-cover" />
            ) : (
              <img src={anime.coverImage.extraLarge || anime.coverImage.large} alt={title} className="h-full w-full object-cover blur-sm scale-110" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          <div className="absolute top-4 left-4 z-20">
            <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative z-10 flex flex-col justify-end min-h-[55vh] px-4 pb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
              <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                <img src={anime.coverImage.extraLarge || anime.coverImage.large} alt={title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium">
                    {anime.format || anime.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
                    {formatStatus(anime.status)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold line-clamp-2">{title}</h1>
                {anime.title.native && title !== anime.title.native && (
                  <p className="text-sm text-muted-foreground">{anime.title.native}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="font-semibold text-foreground">{rating}</span>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="flex items-center gap-1">
                      <Tv className="h-4 w-4" /><span>{anime.episodes} eps</span>
                    </div>
                  )}
                  {anime.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /><span>{anime.duration} min</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {anime.genres?.slice(0, 4).map((g) => (
                    <span key={g} className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium">{g}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Action Buttons */}
        <section className="px-4 -mt-2 relative z-20">
          <div className="flex gap-3">
            <Button variant={inWatchlist ? "secondary" : "outline"} className="flex-1 gap-2" onClick={() => addToWatchlist(movieProxy)}>
              {inWatchlist ? (<><Check className="h-4 w-4" /> In Watchlist</>) : (<><Plus className="h-4 w-4" /> Add to Watchlist</>)}
            </Button>
            <Button variant="glass" size="icon" onClick={() => markAsWatched(movieProxy)}>
              <Check className={`h-4 w-4 ${watched ? 'text-green-400' : ''}`} />
            </Button>
            <Button variant="glass" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Overview */}
        <section className="px-4 mt-6 space-y-3">
          <h2 className="text-lg font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {anime.description?.replace(/<[^>]*>/g, '') || 'No overview available.'}
          </p>
        </section>

        {/* Trailer */}
        {trailerUrl && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Trailer</h2>
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe src={trailerUrl} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Trailer" />
            </div>
          </section>
        )}

        {/* Information Grid */}
        <section className="px-4 mt-6 space-y-3">
          <h2 className="text-lg font-bold">Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="Format" value={anime.format || '—'} />
            <InfoItem label="Episodes" value={anime.episodes?.toString() || '—'} />
            <InfoItem label="Duration" value={anime.duration ? `${anime.duration} min` : '—'} />
            <InfoItem label="Status" value={formatStatus(anime.status)} />
            <InfoItem label="Start Date" value={formatDate(anime.startDate)} />
            <InfoItem label="End Date" value={formatDate(anime.endDate)} />
            <InfoItem label="Season" value={anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : '—'} />
            <InfoItem label="Source" value={formatSource(anime.source)} />
            <InfoItem label="Avg Score" value={anime.averageScore ? `${anime.averageScore}%` : '—'} />
            <InfoItem label="Mean Score" value={anime.meanScore ? `${anime.meanScore}%` : '—'} />
            <InfoItem label="Popularity" value={anime.popularity?.toLocaleString() || '—'} icon={<TrendingUp className="h-3 w-3" />} />
            <InfoItem label="Favorites" value={anime.favourites?.toLocaleString() || '—'} icon={<Heart className="h-3 w-3" />} />
          </div>
          {anime.hashtag && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Hash className="h-3.5 w-3.5" /> {anime.hashtag}
            </div>
          )}
        </section>

        {/* Titles */}
        <section className="px-4 mt-6 space-y-3">
          <h2 className="text-lg font-bold">Titles</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Romaji:</span> <span>{anime.title.romaji}</span></div>
            {anime.title.english && <div><span className="text-muted-foreground">English:</span> <span>{anime.title.english}</span></div>}
            <div><span className="text-muted-foreground">Native:</span> <span>{anime.title.native}</span></div>
            {anime.synonyms?.length > 0 && (
              <div><span className="text-muted-foreground">Synonyms:</span> <span>{anime.synonyms.join(', ')}</span></div>
            )}
          </div>
        </section>

        {/* Studios & Producers */}
        {(animationStudios.length > 0 || producers.length > 0) && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Production</h2>
            {animationStudios.length > 0 && (
              <div className="text-sm"><span className="text-muted-foreground">Studios:</span> <span>{animationStudios.map(s => s.name).join(', ')}</span></div>
            )}
            {producers.length > 0 && (
              <div className="text-sm"><span className="text-muted-foreground">Producers:</span> <span>{producers.map(s => s.name).join(', ')}</span></div>
            )}
          </section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Characters</h2>
            <div className="grid grid-cols-1 gap-3">
              {characters.map((edge) => (
                <div key={edge.node.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-2">
                  <img src={edge.node.image.medium || edge.node.image.large} alt={edge.node.name.full} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{edge.node.name.full}</p>
                    <p className="text-xs text-muted-foreground">{edge.role}</p>
                  </div>
                  {edge.voiceActors?.[0] && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium truncate max-w-[100px]">{edge.voiceActors[0].name.full}</p>
                        <p className="text-[10px] text-muted-foreground">VA</p>
                      </div>
                      <img src={edge.voiceActors[0].image.medium || edge.voiceActors[0].image.large} alt={edge.voiceActors[0].name.full} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Staff */}
        {staff.length > 0 && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Staff</h2>
            <div className="grid grid-cols-1 gap-3">
              {staff.map((edge) => (
                <div key={`${edge.node.id}-${edge.role}`} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-2">
                  <img src={edge.node.image.medium || edge.node.image.large} alt={edge.node.name.full} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{edge.node.name.full}</p>
                    <p className="text-xs text-muted-foreground">{edge.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Status Distribution */}
        {statusDist.length > 0 && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Status Distribution</h2>
            <div className="flex h-4 rounded-full overflow-hidden">
              {statusDist.map((d) => (
                <div key={d.status} className={`${STATUS_COLORS[d.status] || 'bg-muted'}`} style={{ width: `${(d.amount / totalStatusCount) * 100}%` }} title={`${d.status}: ${d.amount}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {statusDist.map((d) => (
                <div key={d.status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[d.status] || 'bg-muted'}`} />
                  <span className="text-muted-foreground">{d.status.charAt(0) + d.status.slice(1).toLowerCase()}</span>
                  <span className="font-medium">{d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related */}
        {relatedAnime.length > 0 && (
          <section className="px-4 mt-8 space-y-3">
            <h2 className="text-lg font-bold">Related</h2>
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
              {relatedAnime.map((edge) => (
                <div key={edge.node.id} className="flex-shrink-0 w-28 cursor-pointer" onClick={() => navigate(`/anime/${edge.node.id}`)}>
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted">
                    <img src={edge.node.coverImage.large} alt={edge.node.title.english || edge.node.title.romaji} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-xs font-medium mt-1 line-clamp-2">{edge.node.title.english || edge.node.title.romaji}</p>
                  <p className="text-[10px] text-muted-foreground">{edge.relationType.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-bold">Recommendations</h2>
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((rec) => {
                const m = rec.mediaRecommendation!;
                return (
                  <div key={m.id} className="flex-shrink-0 w-28 cursor-pointer" onClick={() => navigate(`/anime/${m.id}`)}>
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                      <img src={m.coverImage.large} alt={m.title.english || m.title.romaji} className="w-full h-full object-cover" loading="lazy" />
                      {m.averageScore && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                          <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                          <span className="text-[10px] font-semibold">{(m.averageScore / 10).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium mt-1 line-clamp-2">{m.title.english || m.title.romaji}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Comments */}
        <div className="mt-8">
          <CommentSection contentType="anime" contentId={id || ''} />
        </div>
      </div>
    </AppLayout>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium flex items-center gap-1">{icon}{value}</p>
    </div>
  );
}
