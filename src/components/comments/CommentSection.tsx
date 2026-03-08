import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ThumbsUp, Heart, Laugh, AlertCircle, Frown, Reply, MoreHorizontal, Send, ChevronDown, AlertTriangle, X, Pencil } from 'lucide-react';
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

const REACTION_TYPES = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'funny', emoji: '😂', label: 'Funny' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
];

interface ReactionCount {
  type: string;
  count: number;
  hasReacted: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  profile?: Profile | null;
  replies?: Comment[];
  reactions: ReactionCount[];
  userReaction?: string | null;
}

interface CommentSectionProps {
  contentType: string;
  contentId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  chapterNumber?: number;
}

type SortOption = 'newest' | 'oldest' | 'popular';

export function CommentSection({ contentType, contentId, seasonNumber, episodeNumber, chapterNumber }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const queryKey = ['comments', contentType, contentId, seasonNumber, episodeNumber, chapterNumber];
  const MAX_COMMENT_LENGTH = 5000;

  const fetchReactions = useCallback(async (commentId: string): Promise<ReactionCount[]> => {
    const { data: allReactions } = await supabase
      .from('comment_likes')
      .select('reaction_type, user_id')
      .eq('comment_id', commentId);

    if (!allReactions) return [];

    const counts: Record<string, { count: number; hasReacted: boolean }> = {};
    for (const r of allReactions) {
      const type = (r as any).reaction_type || 'like';
      if (!counts[type]) counts[type] = { count: 0, hasReacted: false };
      counts[type].count++;
      if (r.user_id === user?.id) counts[type].hasReacted = true;
    }

    return Object.entries(counts).map(([type, data]) => ({ type, ...data }));
  }, [user]);

  const getUserReaction = useCallback(async (commentId: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('comment_likes')
      .select('reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();
    return data ? ((data as any).reaction_type || 'like') : null;
  }, [user]);

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Comment[]> => {
      let query = supabase.from('comments').select('*').eq('content_type', contentType).eq('content_id', contentId).is('parent_id', null);
      if (seasonNumber !== undefined) query = query.eq('season_number', seasonNumber);
      if (episodeNumber !== undefined) query = query.eq('episode_number', episodeNumber);
      if (chapterNumber !== undefined) query = query.eq('chapter_number', chapterNumber);

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = userIds.length > 0 
        ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds)
        : { data: [] };

      const commentsWithData = await Promise.all(
        (data || []).map(async (comment) => {
          const profile = profiles?.find(p => p.user_id === comment.user_id);

          const { data: replies } = await supabase
            .from('comments').select('*').eq('parent_id', comment.id).order('created_at', { ascending: true });

          const replyUserIds = [...new Set((replies || []).map(r => r.user_id))].filter(id => !userIds.includes(id));
          const { data: replyProfiles } = replyUserIds.length > 0
            ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', replyUserIds)
            : { data: [] };
          const allProfiles = [...(profiles || []), ...(replyProfiles || [])];

          const repliesWithData = await Promise.all(
            (replies || []).map(async (reply) => {
              const rProfile = allProfiles.find(p => p.user_id === reply.user_id);
              const rReactions = await fetchReactions(reply.id);
              const rUserReaction = await getUserReaction(reply.id);
              return { ...reply, profile: rProfile as Profile | null, replies: [], reactions: rReactions, userReaction: rUserReaction };
            })
          );

          const reactions = await fetchReactions(comment.id);
          const userReaction = await getUserReaction(comment.id);

          return { ...comment, profile: profile as Profile | null, replies: repliesWithData, reactions, userReaction };
        })
      );

      return commentsWithData;
    },
  });

  useEffect(() => {
    const channel = supabase.channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `content_id=eq.${contentId}` }, () => { refetch(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contentId, refetch]);

  // Helper to find and update a comment in the tree (top-level or reply)
  const updateCommentInTree = (comments: Comment[], commentId: string, updater: (c: Comment) => Comment | null): Comment[] => {
    const result: Comment[] = [];
    for (const c of comments) {
      if (c.id === commentId) {
        const updated = updater(c);
        if (updated) result.push(updated);
      } else {
        const updatedReplies = (c.replies || []).map(r => r.id === commentId ? updater(r) : r).filter(Boolean) as Comment[];
        result.push({ ...c, replies: updatedReplies });
      }
    }
    return result;
  };

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) throw new Error('Invalid length');
      const { data, error } = await supabase.from('comments').insert({
        user_id: user.id, content_type: contentType, content_id: contentId,
        season_number: seasonNumber, episode_number: episodeNumber, chapter_number: chapterNumber,
        content: trimmed, parent_id: parentId || null,
      }).select().single();
      if (error) throw error;
      return { ...data, parentId };
    },
    onMutate: async ({ content, parentId }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Comment[]>(queryKey);
      const { data: profileData } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', user!.id).single();
      const optimistic: Comment = {
        id: `temp-${Date.now()}`, user_id: user!.id, content: content.trim(), parent_id: parentId || null,
        likes_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        is_edited: false, profile: profileData as Profile | null, replies: [], reactions: [], userReaction: null,
      };
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) => {
        if (parentId) {
          return old.map(c => c.id === parentId ? { ...c, replies: [...(c.replies || []), optimistic] } : c);
        }
        return [optimistic, ...old];
      });
      setNewComment(''); setReplyContent(''); setReplyTo(null);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); toast.error('Failed to post comment'); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
    onSuccess: () => { toast.success('Comment posted!'); },
  });

  const editComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('comments')
        .update({ content: content.trim(), is_edited: true, updated_at: new Date().toISOString() } as any)
        .eq('id', commentId).eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Comment[]>(queryKey);
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
        updateCommentInTree(old, commentId, c => ({ ...c, content: content.trim(), is_edited: true, updated_at: new Date().toISOString() }))
      );
      setEditingId(null); setEditContent('');
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); toast.error('Failed to update comment'); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
    onSuccess: () => { toast.success('Comment updated'); },
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ commentId, reactionType, currentReaction }: { commentId: string; reactionType: string; currentReaction: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (currentReaction) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      }
      if (currentReaction !== reactionType) {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id, reaction_type: reactionType } as any);
      }
    },
    onMutate: async ({ commentId, reactionType, currentReaction }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Comment[]>(queryKey);
      const isRemoving = currentReaction === reactionType;
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) =>
        updateCommentInTree(old, commentId, c => {
          let reactions = [...c.reactions];
          // Remove old reaction count
          if (currentReaction) {
            reactions = reactions.map(r => r.type === currentReaction ? { ...r, count: r.count - 1, hasReacted: false } : r).filter(r => r.count > 0);
          }
          // Add new reaction count
          if (!isRemoving) {
            const existing = reactions.find(r => r.type === reactionType);
            if (existing) {
              reactions = reactions.map(r => r.type === reactionType ? { ...r, count: r.count + 1, hasReacted: true } : r);
            } else {
              reactions.push({ type: reactionType, count: 1, hasReacted: true });
            }
          }
          return { ...c, reactions, userReaction: isRemoving ? null : reactionType };
        })
      );
      setShowReactionPicker(null);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Comment[]>(queryKey);
      queryClient.setQueryData<Comment[]>(queryKey, (old = []) => updateCommentInTree(old, commentId, () => null));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); toast.error('Failed to delete comment'); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
    onSuccess: () => { toast.success('Comment deleted'); },
  });

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'popular': return (b.reactions.reduce((s, r) => s + r.count, 0)) - (a.reactions.reduce((s, r) => s + r.count, 0));
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      newSet.has(commentId) ? newSet.delete(commentId) : newSet.add(commentId);
      return newSet;
    });
  };

  const renderReactions = (comment: Comment) => {
    const totalReactions = comment.reactions.reduce((s, r) => s + r.count, 0);
    return (
      <div className="relative flex items-center gap-1">
        {/* Quick like button */}
        <button
          onClick={() => isAuthenticated && toggleReaction.mutate({ commentId: comment.id, reactionType: comment.userReaction || 'like', currentReaction: comment.userReaction })}
          onContextMenu={(e) => { e.preventDefault(); if (isAuthenticated) setShowReactionPicker(showReactionPicker === comment.id ? null : comment.id); }}
          className={cn(
            "flex items-center gap-1 text-xs transition-colors px-1.5 py-1 rounded-lg",
            comment.userReaction ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          disabled={!isAuthenticated}
        >
          {comment.userReaction ? (
            <span className="text-sm">{REACTION_TYPES.find(r => r.type === comment.userReaction)?.emoji || '👍'}</span>
          ) : (
            <ThumbsUp className="h-3.5 w-3.5" />
          )}
          {totalReactions > 0 && <span>{totalReactions}</span>}
        </button>

        {/* Reaction summaries */}
        {comment.reactions.length > 0 && (
          <div className="flex -space-x-0.5">
            {comment.reactions.slice(0, 3).map(r => (
              <span key={r.type} className="text-xs">{REACTION_TYPES.find(rt => rt.type === r.type)?.emoji}</span>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactionPicker === comment.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-xl z-20"
            >
              {REACTION_TYPES.map(r => (
                <button
                  key={r.type}
                  onClick={() => toggleReaction.mutate({ commentId: comment.id, reactionType: r.type, currentReaction: comment.userReaction })}
                  className={cn(
                    "text-lg hover:scale-125 transition-transform p-0.5",
                    comment.userReaction === r.type && "bg-primary/20 rounded-full"
                  )}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div key={comment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || undefined} />
        <AvatarFallback>{comment.profile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.profile?.username || 'Anonymous'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {(comment as any).is_edited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
        </div>

        {editingId === comment.id ? (
          <div className="space-y-2">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              className="min-h-[60px] text-sm" maxLength={MAX_COMMENT_LENGTH} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => editComment.mutate({ commentId: comment.id, content: editContent })}
                disabled={!editContent.trim()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90">{comment.content}</p>
        )}

        <div className="flex items-center gap-3">
          {renderReactions(comment)}

          {isAuthenticated && (
            <button
              onClick={() => {
                if (isReply) {
                  setReplyTo(comment.parent_id);
                } else {
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                }
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
          )}

          {/* Long press to show reaction picker on mobile */}
          {isAuthenticated && (
            <button
              onClick={() => setShowReactionPicker(showReactionPicker === comment.id ? null : comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + React
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
                <DropdownMenuItem onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteComment.mutate(comment.id)} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reply input */}
        {replyTo === comment.id && (
          <div className="flex gap-2 mt-2">
            <Textarea placeholder="Write a reply..." value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              className="min-h-[60px] text-sm" maxLength={MAX_COMMENT_LENGTH} />
            <Button size="icon" onClick={() => addComment.mutate({ content: replyContent, parentId: comment.id })}
              disabled={!replyContent.trim() || addComment.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <button onClick={() => toggleReplies(comment.id)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ChevronDown className={cn("h-4 w-4 transition-transform", expandedReplies.has(comment.id) && "rotate-180")} />
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
            <AnimatePresence>
              {expandedReplies.has(comment.id) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</h2>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="popular">Most Liked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAuthenticated ? (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <div className="flex-1">
              <Textarea placeholder="Add a comment..." value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                className="min-h-[80px]" maxLength={MAX_COMMENT_LENGTH} />
              {newComment.length > MAX_COMMENT_LENGTH * 0.9 && (
                <p className="text-xs text-muted-foreground mt-1">{newComment.length}/{MAX_COMMENT_LENGTH}</p>
              )}
            </div>
            <Button size="icon" onClick={() => addComment.mutate({ content: newComment })}
              disabled={!newComment.trim() || addComment.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You must be logged in to post a comment</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>Please respect our{' '}
          <button onClick={() => setShowGuidelines(true)} className="text-primary hover:underline font-medium">Community Guidelines</button>
          {' '}when posting. Tap and hold a reaction or click "+ React" for more options.
        </p>
      </div>

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
                <li>No spoilers without proper warnings.</li>
                <li>Do not post spam, advertisements, or self-promotion.</li>
                <li>Do not share illegal streaming links or pirated content.</li>
                <li>Report inappropriate content instead of engaging with it.</li>
              </ul>
              <p className="text-xs">Violations may result in comment removal or account suspension.</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-1/3" />
                <div className="h-4 bg-secondary rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedComments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-5">{sortedComments.map((comment) => renderComment(comment))}</div>
      )}
    </section>
  );
}
