import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Tv, Film, BookOpen } from 'lucide-react';
import { getMovieDetails, getImageUrl } from '@/lib/tmdb';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/comments/CommentSection';
import { EpisodeSelector } from '@/components/streaming/EpisodeSelector';
import { useState } from 'react';

type ContentType = 'movie' | 'tv' | 'anime' | 'manga';

export default function Watch() {
  const { type, id } = useParams<{ type: ContentType; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const season = parseInt(searchParams.get('season') || '1');
  const episode = parseInt(searchParams.get('episode') || '1');
  const chapter = parseInt(searchParams.get('chapter') || '1');
  const dub = searchParams.get('dub') === '1';

  const [currentSeason, setCurrentSeason] = useState(season);
  const [currentEpisode, setCurrentEpisode] = useState(episode);
  const [currentChapter, setCurrentChapter] = useState(chapter);

  // Fetch movie/TV details from TMDB
  const { data: details, isLoading } = useQuery({
    queryKey: ['content', type, id],
    queryFn: () => getMovieDetails(Number(id)),
    enabled: !!id && (type === 'movie' || type === 'tv'),
  });

  // Build the VIDSRC embed URL
  const getEmbedUrl = (): string => {
    switch (type) {
      case 'movie':
        return `https://vidsrc.icu/embed/movie/${id}`;
      case 'tv':
        return `https://vidsrc.icu/embed/tv/${id}/${currentSeason}/${currentEpisode}`;
      case 'anime':
        return `https://vidsrc.icu/embed/anime/${id}/${currentEpisode}/${dub ? '1' : '0'}`;
      case 'manga':
        return `https://vidsrc.icu/embed/manga/${id}/${currentChapter}`;
      default:
        return '';
    }
  };

  const getContentTitle = (): string => {
    if (details) return details.title || details.name || 'Untitled';
    if (type === 'anime') return `Anime ${id}`;
    if (type === 'manga') return `Manga ${id}`;
    return 'Loading...';
  };

  const getContentIcon = () => {
    switch (type) {
      case 'movie':
        return <Film className="h-5 w-5" />;
      case 'tv':
      case 'anime':
        return <Tv className="h-5 w-5" />;
      case 'manga':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <Film className="h-5 w-5" />;
    }
  };

  const handleEpisodeChange = (newSeason: number, newEpisode: number) => {
    setCurrentSeason(newSeason);
    setCurrentEpisode(newEpisode);
    const params = new URLSearchParams(searchParams);
    params.set('season', newSeason.toString());
    params.set('episode', newEpisode.toString());
    navigate(`/watch/${type}/${id}?${params.toString()}`, { replace: true });
  };

  const handleChapterChange = (newChapter: number) => {
    setCurrentChapter(newChapter);
    const params = new URLSearchParams(searchParams);
    params.set('chapter', newChapter.toString());
    navigate(`/watch/${type}/${id}?${params.toString()}`, { replace: true });
  };

  if (isLoading) {
    return (
      <AppLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <div className="pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {getContentIcon()}
              <h1 className="font-semibold truncate">{getContentTitle()}</h1>
              {(type === 'tv' || type === 'anime') && (
                <span className="text-muted-foreground text-sm">
                  S{currentSeason}E{currentEpisode}
                </span>
              )}
              {type === 'manga' && (
                <span className="text-muted-foreground text-sm">
                  Ch. {currentChapter}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Video Player */}
        <section className="w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-video bg-black"
          >
            <iframe
              src={getEmbedUrl()}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={getContentTitle()}
            />
          </motion.div>
        </section>

        {/* Episode/Chapter Selector */}
        {(type === 'tv' || type === 'anime') && (
          <EpisodeSelector
            contentId={id || ''}
            contentType={type}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            totalSeasons={details?.number_of_seasons || 1}
            onEpisodeChange={handleEpisodeChange}
          />
        )}

        {type === 'manga' && (
          <section className="px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentChapter <= 1}
                onClick={() => handleChapterChange(currentChapter - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Chapter {currentChapter}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChapterChange(currentChapter + 1)}
              >
                Next
              </Button>
            </div>
          </section>
        )}

        {/* Content Info */}
        {details && (
          <section className="px-4 py-4 space-y-3">
            <h2 className="text-lg font-bold">{getContentTitle()}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {details.overview || 'No description available.'}
            </p>
          </section>
        )}

        {/* Comment Section */}
        <CommentSection
          contentType={type || 'movie'}
          contentId={id || ''}
          seasonNumber={type === 'tv' || type === 'anime' ? currentSeason : undefined}
          episodeNumber={type === 'tv' || type === 'anime' ? currentEpisode : undefined}
          chapterNumber={type === 'manga' ? currentChapter : undefined}
        />
      </div>
    </AppLayout>
  );
}
