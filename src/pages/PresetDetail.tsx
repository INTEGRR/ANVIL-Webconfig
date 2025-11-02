import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowUp, ArrowDown, Download, Clock, User as UserIcon, MessageSquare, Share2 } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  creator_id: string;
  rgb_config: any;
  effect_config: any;
  keymap_config: any;
  macro_config: any;
  download_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function PresetDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      loadPreset();
      loadComments();
    }
  }, [id, user]);

  const loadPreset = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('presets')
        .select(`
          *,
          profiles:creator_id (username, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setPreset(data);

      const { data: scoreData } = await supabase
        .from('preset_scores')
        .select('score')
        .eq('preset_id', id)
        .single();

      setScore(scoreData?.score || 0);

      if (user) {
        const { data: voteData } = await supabase
          .from('ratings')
          .select('vote')
          .eq('user_id', user.id)
          .eq('preset_id', id)
          .maybeSingle();

        setUserVote(voteData?.vote || 0);
      }
    } catch (error) {
      console.error('Error loading preset:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('preset_id', id)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleVote = async (newVote: number) => {
    if (!user || !id) return;

    try {
      if (userVote === newVote) {
        await supabase
          .from('ratings')
          .delete()
          .eq('user_id', user.id)
          .eq('preset_id', id);
        setUserVote(0);
        setScore(score - newVote);
      } else if (userVote === 0) {
        await supabase
          .from('ratings')
          .insert({
            user_id: user.id,
            preset_id: id,
            vote: newVote,
          });
        setUserVote(newVote);
        setScore(score + newVote);
      } else {
        await supabase
          .from('ratings')
          .update({ vote: newVote })
          .eq('user_id', user.id)
          .eq('preset_id', id);
        setUserVote(newVote);
        setScore(score - userVote + newVote);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleLoadPreset = async () => {
    if (!preset) return;

    await supabase
      .from('presets')
      .update({ download_count: (preset.download_count || 0) + 1 })
      .eq('id', preset.id);

    navigate('/configurator', {
      state: {
        preset: {
          colors: preset.rgb_config?.colors,
          effect: preset.effect_config,
          keymap: preset.keymap_config?.keymap
        }
      }
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          preset_id: id,
          content: newComment,
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-brown flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-beige border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="min-h-screen bg-brand-brown flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Preset not found</h1>
          <Link to="/gallery" className="text-brand-beige hover:underline">
            Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-brand-teal rounded-2xl border border-brand-sage/20 overflow-hidden mb-8">
          <div className="aspect-video bg-brand-teal/60 flex items-center justify-center">
            {preset.thumbnail_url ? (
              <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-brand-sage text-lg">No preview available</div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => handleVote(1)}
                  disabled={!user}
                  className={`p-2 rounded-lg transition-colors ${
                    userVote === 1
                      ? 'text-brand-beige bg-brand-beige/10'
                      : 'text-brand-sage hover:text-brand-blue hover:bg-brand-teal/60'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ArrowUp className="w-6 h-6" />
                </button>
                <span className="text-white font-bold text-xl">{score}</span>
                <button
                  onClick={() => handleVote(-1)}
                  disabled={!user}
                  className={`p-2 rounded-lg transition-colors ${
                    userVote === -1
                      ? 'text-blue-500 bg-blue-500/10'
                      : 'text-brand-sage hover:text-brand-blue hover:bg-brand-teal/60'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ArrowDown className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-3">{preset.name}</h1>
                <div className="flex items-center gap-4 text-brand-sage mb-4">
                  <Link
                    to={`/user/${preset.creator_id}`}
                    className="flex items-center gap-2 hover:text-brand-blue transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    {preset.profiles?.username || 'Unknown'}
                  </Link>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeAgo(preset.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {preset.download_count} downloads
                  </span>
                </div>
                {preset.description && (
                  <p className="text-brand-blue leading-relaxed mb-6">{preset.description}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleLoadPreset}
                    className="bg-brand-beige hover:bg-brand-beige/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Load in Configurator
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }}
                    className="bg-brand-teal/60 hover:bg-brand-teal/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-brand-teal rounded-2xl border border-brand-sage/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-beige" />
            Comments ({comments.length})
          </h2>

          {user ? (
            <form onSubmit={handleComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-3 bg-brand-beige hover:bg-brand-beige/90 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Comment
              </button>
            </form>
          ) : (
            <div className="mb-8 text-center py-4 bg-brand-teal/60 rounded-lg border border-brand-sage/30">
              <p className="text-brand-sage">
                <Link to="/login" className="text-brand-beige hover:underline">
                  Sign in
                </Link>{' '}
                to leave a comment
              </p>
            </div>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-brand-sage text-center py-8">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-brand-teal/60 rounded-lg p-4 border border-brand-sage/20">
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-4 h-4 text-brand-sage" />
                    <span className="text-white font-medium">{comment.profiles?.username || 'Unknown'}</span>
                    <span className="text-brand-sage text-sm">•</span>
                    <span className="text-brand-sage text-sm">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-brand-blue">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
