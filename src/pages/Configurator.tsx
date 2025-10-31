import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Download, Upload } from 'lucide-react';
import KeyboardLayout from '../components/KeyboardLayout';
import RGBControls from '../components/RGBControls';
import { DEFAULT_COLORS } from '../data/keyboardLayout';

export default function Configurator() {
  const { user } = useAuth();
  const [keyColors, setKeyColors] = useState<number[][]>(DEFAULT_COLORS.map(c => [...c]));
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleKeyClick = (index: number, shiftKey: boolean) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (shiftKey) {
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
      } else {
        newSet.clear();
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleColorChange = (h: number, s: number, v: number) => {
    setKeyColors((prev) => {
      const newColors = prev.map(c => [...c]);
      selectedKeys.forEach((index) => {
        newColors[index] = [h, s, v];
      });
      return newColors;
    });
  };

  const handleClearSelection = () => {
    setSelectedKeys(new Set());
  };

  const handleResetColors = () => {
    if (confirm('Reset all keys to default colors?')) {
      setKeyColors(DEFAULT_COLORS.map(c => [...c]));
      setSelectedKeys(new Set());
    }
  };

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
        .maybeSingle();

      if (!keyboardModel) {
        alert('Keyboard model not found');
        return;
      }

      const rgbConfig = {
        colors: keyColors,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('presets')
        .insert({
          name: presetName,
          description: description || null,
          creator_id: user.id,
          keyboard_model_id: keyboardModel.id,
          rgb_config: rgbConfig,
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

  const handleExportJson = () => {
    const exportData = {
      name: presetName || 'Untitled Preset',
      description: description,
      keyColors: keyColors,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetName || 'preset'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.keyColors && Array.isArray(data.keyColors)) {
          setKeyColors(data.keyColors);
          setPresetName(data.name || '');
          setDescription(data.description || '');
          alert('Preset imported successfully!');
        } else {
          alert('Invalid preset file format');
        }
      } catch (error) {
        console.error('Error importing:', error);
        alert('Failed to import preset');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Keyboard Configurator</h1>
          <p className="text-brand-sage">Create and customize your RGB lighting preset</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <KeyboardLayout
              keyColors={keyColors}
              selectedKeys={selectedKeys}
              onKeyClick={handleKeyClick}
            />

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

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !user}
                    className="flex-1 bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save to Cloud'}
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="flex-1 bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export JSON
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="importFile"
                    className="w-full bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    Import JSON
                  </label>
                  <input
                    id="importFile"
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </div>

                {!user && (
                  <p className="text-brand-sage text-sm text-center">
                    Sign in to save presets to the cloud
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <RGBControls
              selectedKeys={selectedKeys}
              keyColors={keyColors}
              onColorChange={handleColorChange}
              onClearSelection={handleClearSelection}
              onResetColors={handleResetColors}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
