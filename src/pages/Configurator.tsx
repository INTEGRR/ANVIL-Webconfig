import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Download, Upload, Usb } from 'lucide-react';
import KeyboardLayout from '../components/KeyboardLayout';
import RGBControls from '../components/RGBControls';
import { DEFAULT_COLORS } from '../data/keyboardLayout';

export default function Configurator() {
  const { user } = useAuth();
  const location = useLocation();
  const [keyColors, setKeyColors] = useState<number[][]>(DEFAULT_COLORS.map(c => [...c]));
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (location.state?.preset) {
      const loadedPreset = location.state.preset;
      if (loadedPreset.colors && Array.isArray(loadedPreset.colors)) {
        setKeyColors(loadedPreset.colors);
      }
    }
  }, [location.state]);

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

  const connectToKeyboard = async () => {
    try {
      if (!('hid' in navigator)) {
        alert('WebHID is not supported in your browser. Please use Chrome or Edge.');
        return;
      }

      const devices = await (navigator as any).hid.requestDevice({
        filters: [{ vendorId: 0x1209 }]
      });

      if (devices.length === 0) {
        alert('No device selected');
        return;
      }

      const selectedDevice = devices[0];
      await selectedDevice.open();
      setDevice(selectedDevice);
      setConnected(true);
      alert('Connected to keyboard!');
    } catch (error) {
      console.error('Error connecting to keyboard:', error);
      alert('Failed to connect to keyboard');
    }
  };

  const disconnectFromKeyboard = async () => {
    if (device) {
      try {
        await device.close();
        setDevice(null);
        setConnected(false);
        alert('Disconnected from keyboard');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  };

  const sendColorToKeyboard = async (keyIndex: number, h: number, s: number, v: number) => {
    if (!device || !connected) return;

    try {
      const data = new Uint8Array(32);
      data[0] = 0x20;
      data[1] = keyIndex;
      data[2] = h;
      data[3] = s;
      data[4] = v;

      await device.sendReport(0, data);
    } catch (error) {
      console.error('Error sending color to keyboard:', error);
    }
  };

  const syncAllColorsToKeyboard = async () => {
    if (!device || !connected) {
      alert('Please connect to keyboard first');
      return;
    }

    try {
      for (let i = 0; i < keyColors.length; i++) {
        await sendColorToKeyboard(i, keyColors[i][0], keyColors[i][1], keyColors[i][2]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      alert('All colors synced to keyboard!');
    } catch (error) {
      console.error('Error syncing colors:', error);
      alert('Failed to sync colors to keyboard');
    }
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
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Usb className="w-5 h-5 text-brand-beige" />
                Hardware Connection
              </h2>

              <div className="space-y-3 mb-6">
                {connected ? (
                  <>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Connected to keyboard
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={syncAllColorsToKeyboard}
                        className="flex-1 bg-brand-beige hover:bg-brand-beige/90 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Usb className="w-4 h-4" />
                        Sync to Keyboard
                      </button>
                      <button
                        onClick={disconnectFromKeyboard}
                        className="px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg font-semibold transition-colors text-sm"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={connectToKeyboard}
                    className="w-full bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2"
                  >
                    <Usb className="w-5 h-5" />
                    Connect to Keyboard
                  </button>
                )}
                <p className="text-brand-sage text-xs">
                  Requires Chrome/Edge browser with WebHID support
                </p>
              </div>
            </div>

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

            {selectedKeys.size > 0 && connected && (
              <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
                <button
                  onClick={async () => {
                    for (const index of selectedKeys) {
                      await sendColorToKeyboard(index, keyColors[index][0], keyColors[index][1], keyColors[index][2]);
                    }
                    alert(`Applied colors to ${selectedKeys.size} key${selectedKeys.size > 1 ? 's' : ''}!`);
                  }}
                  className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Usb className="w-6 h-6" />
                  Apply to Keyboard ({selectedKeys.size} key{selectedKeys.size > 1 ? 's' : ''})
                </button>
                <p className="text-brand-sage text-xs mt-2 text-center">
                  Sends selected colors to your connected keyboard
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
