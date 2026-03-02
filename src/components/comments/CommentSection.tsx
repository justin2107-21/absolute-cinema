import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ThumbsUp, Reply, MoreHorizontal, Send, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  profile?: Profile | null;
  replies?: Comment[];
  isLiked?: boolean;
}

interface CommentSectionProps {
  contentType: string;
  contentId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  chapterNumber?: number;
}

type SortOption = 'newest' | 'oldest' | 'popular';

export function CommentSection({
  contentType,
  contentId,
  seasonNumber,
  episodeNumber,
  chapterNumber,
}: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Build query key based on context
  const queryKey = ['comments', contentType, contentId, seasonNumber, episodeNumber, chapterNumber];

  // Fetch comments
  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Comment[]> => {
      let query = supabase
        .from('comments')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .is('parent_id', null);

      if (seasonNumber !== undefined) {
        query = query.eq('season_number', seasonNumber);
      }
      if (episodeNumber !== undefined) {
        query = query.eq('episode_number', episodeNumber);
      }
      if (chapterNumber !== undefined) {
        query = query.eq('chapter_number', chapterNumber);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles and replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', comment.user_id)
            .single();

          // Fetch replies
          const { data: replies } = await supabase
            .from('comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          // Get profiles for replies
          const repliesWithProfiles = await Promise.all(
            (replies || []).map(async (reply) => {
              const { data: replyProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('user_id', reply.user_id)
                .single();
              return {
                ...reply,
                profile: replyProfile as Profile | null,
              };
            })
          );

          // Check if user liked the comment
          let isLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single();
            isLiked = !!like;
          }

          return {
            ...comment,
            profile: profileData as Profile | null,
            replies: repliesWithProfiles,
            isLiked,
          };
        })
      );

      return commentsWithReplies;
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `content_id=eq.${contentId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, refetch]);

  // Add comment mutation
  const MAX_COMMENT_LENGTH = 5000;

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Comment must be between 1 and ${MAX_COMMENT_LENGTH} characters`);
      }

      const { error } = await supabase.from('comments').insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        chapter_number: chapterNumber,
        content,
        parent_id: parentId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      setReplyContent('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment posted!');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  // Like mutation
  const toggleLike = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert({
          comment_id: commentId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Comment deleted');
    },
  });

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'popular':
        return b.likes_count - a.likes_count;
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isReply && "ml-10 mt-3")}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback>
          {comment.profile?.username?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.profile?.username || 'Anonymous'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>

        <p className="text-sm text-foreground/90">{comment.content}</p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => isAuthenticated && toggleLike.mutate({ commentId: comment.id, isLiked: comment.isLiked || false })}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              comment.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            disabled={!isAuthenticated}
          >
            <ThumbsUp className={cn("h-4 w-4", comment.isLiked && "fill-current")} />
            {comment.likes_count > 0 && comment.likes_count}
          </button>

          {isAuthenticated && !isReply && (
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
          )}

          {user?.id === comment.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => deleteComment.mutate(comment.id)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reply input */}
        {replyTo === comment.id && (
          <div className="flex gap-2 mt-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              className="min-h-[60px] text-sm"
              maxLength={MAX_COMMENT_LENGTH}
            />
            <Button
              size="icon"
              onClick={() => addComment.mutate({ content: replyContent, parentId: comment.id })}
              disabled={!replyContent.trim() || addComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => toggleReplies(comment.id)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedReplies.has(comment.id) && "rotate-180"
                )}
              />
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>

            <AnimatePresence>
              {expandedReplies.has(comment.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <section className="px-4 py-6 space-y-6 border-t border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h2>
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="popular">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* New Comment Input */}
      {isAuthenticated ? (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                className="min-h-[80px]"
                maxLength={MAX_COMMENT_LENGTH}
              />
              {newComment.length > MAX_COMMENT_LENGTH * 0.9 && (
                <p className="text-xs text-muted-foreground mt-1">{newComment.length}/{MAX_COMMENT_LENGTH}</p>
              )}
            </div>
            <Button
              size="icon"
              onClick={() => addComment.mutate({ content: newComment })}
              disabled={!newComment.trim() || addComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            You must be logged in to post a comment
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
            Sign In
          </Button>
        </div>
      )}

      {/* Community Guidelines */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          Please respect our{' '}
          <button onClick={() => setShowGuidelines(true)} className="text-primary hover:underline font-medium">
            Community Guidelines
          </button>{' '}
          when posting comments.
        </p>
      </div>

      {/* Community Guidelines Dialog */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGuidelines(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Community Guidelines</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGuidelines(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Be respectful and constructive</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>Treat others with respect. No hate speech, harassment, or personal attacks.</li>
                <li>Keep discussions relevant to the content being discussed.</li>
                <li>No spoilers without proper warnings — use spoiler tags when discussing plot points.</li>
                <li>Do not post spam, advertisements, or self-promotion.</li>
                <li>Avoid excessive use of caps, emojis, or repetitive messages.</li>
                <li>Do not share illegal streaming links or pirated content.</li>
                <li>Report inappropriate content instead of engaging with it.</li>
                <li>Keep language appropriate — this is a community for all ages.</li>
              </ul>
              <p className="text-xs">Violations may result in comment removal or account suspension.</p>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-secondary rounded" />
                <div className="h-10 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedComments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </section>
  );
}
