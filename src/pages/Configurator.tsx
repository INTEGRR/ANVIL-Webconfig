import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Keyboard as KeyboardIcon } from 'lucide-react';

export default function Configurator() {
  const { user } = useAuth();
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to save presets');
      return;
    }

    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    setSaving(true);

    try {
      const { data: keyboardModel } = await supabase
        .from('keyboard_models')
        .select('id')
        .eq('name', 'Anvil Native')
        .single();

      if (!keyboardModel) {
        alert('Keyboard model not found');
        return;
      }

      const { error } = await supabase
        .from('presets')
        .insert({
          name: presetName,
          description: description || null,
          creator_id: user.id,
          keyboard_model_id: keyboardModel.id,
          rgb_config: { colors: [] },
          visibility: 'public',
        });

      if (error) throw error;

      alert('Preset saved successfully!');
      setPresetName('');
      setDescription('');
    } catch (error) {
      console.error('Error saving preset:', error);
      alert('Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Keyboard Configurator</h1>
          <p className="text-brand-sage">Create and customize your keyboard preset</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-8">
              <div className="aspect-video bg-brand-teal/60 rounded-lg flex items-center justify-center border border-brand-sage/30">
                <div className="text-center">
                  <KeyboardIcon className="w-24 h-24 text-brand-sage mx-auto mb-4" />
                  <p className="text-brand-sage">Keyboard visualization will appear here</p>
                  <p className="text-brand-blue text-sm mt-2">RGB controls and key mapping coming soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Save Preset</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="presetName" className="block text-sm font-medium text-brand-blue mb-2">
                    Preset Name
                  </label>
                  <input
                    id="presetName"
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="My Awesome Preset"
                    className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-brand-blue mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your preset..."
                    rows={3}
                    className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !user}
                  className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Preset'}
                </button>

                {!user && (
                  <p className="text-brand-sage text-sm text-center">
                    Sign in to save presets to the cloud
                  </p>
                )}
              </div>
            </div>

            <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-brand-blue text-sm">
                <li>• Click keys to select them for editing</li>
                <li>• Use the color picker to change RGB values</li>
                <li>• Save presets to share with the community</li>
                <li>• Download presets from the gallery</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
