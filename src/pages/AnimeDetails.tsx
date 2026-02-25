import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Play, BookOpen, Calendar, Tv } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/comments/CommentSection';

const ANILIST_API = 'https://graphql.anilist.co';

interface AniListDetailMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string };
  coverImage: { extraLarge: string; large: string };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  chapters: number | null;
  status: string;
  type: 'ANIME' | 'MANGA';
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  studios: { nodes: { name: string }[] };
  trailer: { id: string; site: string } | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: { english: string | null; romaji: string };
        coverImage: { large: string };
        type: string;
        averageScore: number | null;
      };
    }[];
  };
}

async function getAniListDetails(id: number): Promise<AniListDetailMedia | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        description(asHtml: false)
        genres
        averageScore
        episodes
        chapters
        status
        type
        season
        seasonYear
        format
        studios(isMain: true) { nodes { name } }
        trailer { id site }
        startDate { year month day }
        endDate { year month day }
        relations {
          edges {
            relationType
            node {
              id
              title { english romaji }
              coverImage { large }
              type
              averageScore
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } }),
    });
    const data = await res.json();
    return data.data.Media;
  } catch {
    return null;
  }
}

export default function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: anime, isLoading } = useQuery({
    queryKey: ['anilist-detail', id],
    queryFn: () => getAniListDetails(Number(id)),
    enabled: !!id,
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

  if (!anime) {
    return (
      <AppLayout hideNav>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Content not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const studio = anime.studios?.nodes?.[0]?.name;
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const startYear = anime.startDate?.year;
  const statusLabel = anime.status === 'FINISHED' ? 'Finished' : anime.status === 'RELEASING' ? 'Airing' : anime.status === 'NOT_YET_RELEASED' ? 'Upcoming' : anime.status;
  const trailerUrl = anime.trailer?.site === 'youtube' ? `https://www.youtube.com/embed/${anime.trailer.id}` : null;

  const relatedAnime = anime.relations?.edges?.filter(e => 
    ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'ALTERNATIVE'].includes(e.relationType)
  ).slice(0, 10) || [];

  return (
    <AppLayout hideNav>
      <div className="pb-8">
        {/* Hero */}
        <header className="relative min-h-[60vh]">
          <div className="absolute inset-0">
            {anime.bannerImage ? (
              <img src={anime.bannerImage} alt={title} className="h-full w-full object-cover" />
            ) : (
              <img src={anime.coverImage.extraLarge || anime.coverImage.large} alt={title} className="h-full w-full object-cover blur-sm" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          <div className="absolute top-4 left-4 z-20">
            <Button variant="glass" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative z-10 flex flex-col justify-end min-h-[60vh] px-4 pb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
              <div className="w-28 h-40 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                <img src={anime.coverImage.extraLarge || anime.coverImage.large} alt={title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium">
                    {anime.type === 'ANIME' ? 'Anime' : 'Manga'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
                    {statusLabel}
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
                      <Tv className="h-4 w-4" />
                      <span>{anime.episodes} episodes</span>
                    </div>
                  )}
                  {anime.chapters && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{anime.chapters} chapters</span>
                    </div>
                  )}
                  {startYear && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{anime.season ? `${anime.season} ` : ''}{startYear}</span>
                    </div>
                  )}
                </div>
                {studio && <p className="text-xs text-muted-foreground">Studio: {studio}</p>}
                {anime.format && <p className="text-xs text-muted-foreground">Format: {anime.format}</p>}
                <div className="flex flex-wrap gap-2">
                  {anime.genres?.slice(0, 4).map((genre) => (
                    <span key={genre} className="px-2 py-1 rounded-lg bg-secondary text-xs font-medium">{genre}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </header>

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
                  <p className="text-[10px] text-muted-foreground">{edge.relationType}</p>
                </div>
              ))}
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
