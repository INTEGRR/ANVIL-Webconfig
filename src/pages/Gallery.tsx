import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowUp, ArrowDown, Download, Clock, TrendingUp, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Preset {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  creator_id: string;
  download_count: number;
  created_at: string;
  profiles: {
    username: string;
  } | null;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  user_vote?: number;
  comment_count?: number;
}

type SortOption = 'hot' | 'new' | 'top';

export default function Gallery() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadPresets();
  }, [sortBy, user]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('presets')
        .select(`
          *,
          profiles:creator_id (username)
        `)
        .eq('visibility', 'public');

      const { data: presetsData, error } = await query;

      if (error) throw error;

      const presetIds = presetsData?.map(p => p.id) || [];

      const { data: scoresData } = await supabase
        .from('preset_scores')
        .select('*')
        .in('preset_id', presetIds);

      const { data: userVotes } = user ? await supabase
        .from('ratings')
        .select('preset_id, vote')
        .eq('user_id', user.id)
        .in('preset_id', presetIds) : { data: null };

      const { data: commentsData } = await supabase
        .from('comments')
        .select('preset_id')
        .in('preset_id', presetIds);

      const commentCounts = new Map<string, number>();
      commentsData?.forEach(comment => {
        commentCounts.set(comment.preset_id, (commentCounts.get(comment.preset_id) || 0) + 1);
      });

      const votesMap = new Map(userVotes?.map(v => [v.preset_id, v.vote]) || []);
      const scoresMap = new Map(scoresData?.map(s => [s.preset_id, s]) || []);

      const enrichedPresets = presetsData?.map(preset => {
        const scores = scoresMap.get(preset.id);
        return {
          ...preset,
          score: scores?.score || 0,
          upvotes: scores?.upvotes || 0,
          downvotes: scores?.downvotes || 0,
          user_vote: votesMap.get(preset.id) || 0,
          comment_count: commentCounts.get(preset.id) || 0,
        };
      }) || [];

      let sorted = [...enrichedPresets];
      if (sortBy === 'new') {
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === 'top') {
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else {
        sorted.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          const hoursSinceA = (Date.now() - timeA) / (1000 * 60 * 60);
          const hoursSinceB = (Date.now() - timeB) / (1000 * 60 * 60);
          const hotScoreA = (a.score || 0) / Math.pow(hoursSinceA + 2, 1.5);
          const hotScoreB = (b.score || 0) / Math.pow(hoursSinceB + 2, 1.5);
          return hotScoreB - hotScoreA;
        });
      }

      setPresets(sorted);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (presetId: string, currentVote: number, newVote: number) => {
    if (!user) return;

    try {
      if (currentVote === newVote) {
        await supabase
          .from('ratings')
          .delete()
          .eq('user_id', user.id)
          .eq('preset_id', presetId);
      } else if (currentVote === 0) {
        await supabase
          .from('ratings')
          .insert({
            user_id: user.id,
            preset_id: presetId,
            vote: newVote,
          });
      } else {
        await supabase
          .from('ratings')
          .update({ vote: newVote })
          .eq('user_id', user.id)
          .eq('preset_id', presetId);
      }

      loadPresets();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const filteredPresets = searchQuery
    ? presets.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.profiles?.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : presets;

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Community Gallery</h1>
          <p className="text-brand-sage">Discover and share keyboard presets</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-sage" />
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-teal text-white pl-10 pr-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('hot')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                sortBy === 'hot'
                  ? 'bg-brand-beige text-white'
                  : 'bg-brand-teal text-brand-blue hover:bg-brand-teal/80'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Hot
            </button>
            <button
              onClick={() => setSortBy('new')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                sortBy === 'new'
                  ? 'bg-brand-beige text-white'
                  : 'bg-brand-teal text-brand-blue hover:bg-brand-teal/80'
              }`}
            >
              <Clock className="w-4 h-4" />
              New
            </button>
            <button
              onClick={() => setSortBy('top')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                sortBy === 'top'
                  ? 'bg-brand-beige text-white'
                  : 'bg-brand-teal text-brand-blue hover:bg-brand-teal/80'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              Top
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-brand-beige border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-sage text-lg">No presets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="bg-brand-teal rounded-xl border border-brand-sage/20 overflow-hidden hover:border-brand-beige/50 transition-colors"
              >
                <Link to={`/preset/${preset.id}`} className="block">
                  <div className="aspect-video bg-brand-brown flex items-center justify-center overflow-hidden">
                    {preset.thumbnail_url ? (
                      <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-brand-sage">No preview</div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex flex-col items-center gap-1 py-1">
                      <button
                        onClick={() => handleVote(preset.id, preset.user_vote || 0, 1)}
                        disabled={!user}
                        className={`p-1 rounded transition-colors ${
                          preset.user_vote === 1
                            ? 'text-brand-beige'
                            : 'text-brand-sage hover:text-brand-blue'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <span className="text-white font-semibold text-sm">{preset.score || 0}</span>
                      <button
                        onClick={() => handleVote(preset.id, preset.user_vote || 0, -1)}
                        disabled={!user}
                        className={`p-1 rounded transition-colors ${
                          preset.user_vote === -1
                            ? 'text-blue-500'
                            : 'text-brand-sage hover:text-brand-blue'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link to={`/preset/${preset.id}`}>
                        <h3 className="text-white font-semibold hover:text-brand-beige transition-colors truncate">
                          {preset.name}
                        </h3>
                      </Link>
                      <p className="text-brand-sage text-sm">
                        by <Link to={`/user/${preset.creator_id}`} className="hover:text-brand-blue transition-colors">{preset.profiles?.username || 'Unknown'}</Link>
                      </p>
                      {preset.description && (
                        <p className="text-brand-blue text-sm mt-2 line-clamp-2">{preset.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-brand-sage border-t border-brand-sage/20 pt-3">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {preset.download_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {preset.comment_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(preset.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
