import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Globe, Lock, Link as LinkIcon } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  download_count: number;
  created_at: string;
  updated_at: string;
}

export default function MyPresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPresets();
    }
  }, [user]);

  const loadPresets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('presets')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePreset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const { error } = await supabase
        .from('presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      alert('Failed to delete preset');
    }
  };

  const updateVisibility = async (id: string, newVisibility: 'public' | 'unlisted' | 'private') => {
    try {
      const { error } = await supabase
        .from('presets')
        .update({ visibility: newVisibility })
        .eq('id', id);

      if (error) throw error;
      loadPresets();
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update visibility');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-brown flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <Link to="/login" className="text-brand-beige hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Presets</h1>
            <p className="text-brand-sage">Manage your keyboard configurations</p>
          </div>
          <Link
            to="/configurator"
            className="bg-brand-beige hover:bg-brand-beige/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Create New Preset
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-brand-beige border-t-transparent rounded-full animate-spin" />
          </div>
        ) : presets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-sage text-lg mb-4">You haven't created any presets yet</p>
            <Link
              to="/configurator"
              className="inline-block bg-brand-beige hover:bg-brand-beige/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Your First Preset
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="bg-brand-teal rounded-xl border border-brand-sage/20 overflow-hidden"
              >
                <Link to={`/preset/${preset.id}`} className="block">
                  <div className="aspect-video bg-brand-teal/60 flex items-center justify-center">
                    {preset.thumbnail_url ? (
                      <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-brand-sage">No preview</div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link to={`/preset/${preset.id}`}>
                    <h3 className="text-white font-semibold mb-2 hover:text-brand-beige transition-colors">
                      {preset.name}
                    </h3>
                  </Link>

                  {preset.description && (
                    <p className="text-brand-blue text-sm mb-3 line-clamp-2">{preset.description}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3 text-xs text-brand-sage">
                    <span>Created {formatDate(preset.created_at)}</span>
                    <span>•</span>
                    <span>{preset.download_count} downloads</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={preset.visibility}
                      onChange={(e) => updateVisibility(preset.id, e.target.value as any)}
                      className="flex-1 bg-brand-teal/60 text-white px-3 py-2 rounded-lg border border-brand-sage/30 text-sm outline-none focus:border-brand-beige transition-colors"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>

                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      title="Delete preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
