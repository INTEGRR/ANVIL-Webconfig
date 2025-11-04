import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Save, Download, Upload, Usb } from 'lucide-react';
import KeyboardLayout from '../components/KeyboardLayout';
import RGBControls from '../components/RGBControls';
import EffectControls from '../components/EffectControls';
import KeymapControls from '../components/KeymapControls';
import KeycodeSelector from '../components/KeycodeSelector';
import KeymapDebugger from '../components/KeymapDebugger';
import { DEFAULT_COLORS, KEYBOARD_LAYOUT } from '../data/keyboardLayout';
import { hsvToHex } from '../utils/colorUtils';
import { EffectConfig, DEFAULT_EFFECT_CONFIG } from '../types/effects';
import { keycodeToHex } from '../utils/keycodeConverter';

export default function Configurator() {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [keyColors, setKeyColors] = useState<number[][]>(DEFAULT_COLORS.map(c => [...c]));
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [lastSelectedKey, setLastSelectedKey] = useState<number | null>(null);
  const [presetName, setPresetName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [effectConfig, setEffectConfig] = useState<EffectConfig>(DEFAULT_EFFECT_CONFIG);
  const [keymapMode, setKeymapMode] = useState(false);
  const [keymap, setKeymap] = useState<string[]>(KEYBOARD_LAYOUT.map(k => k.keyCode));
  const [selectedKeyForKeymap, setSelectedKeyForKeymap] = useState<number | null>(null);
  const [showIndexes, setShowIndexes] = useState(false);

  useEffect(() => {
    if (location.state?.preset) {
      const loadedPreset = location.state.preset;
      if (loadedPreset.colors && Array.isArray(loadedPreset.colors)) {
        setKeyColors(loadedPreset.colors);
      }
      if (loadedPreset.effect) {
        setEffectConfig(loadedPreset.effect);
      }
      if (loadedPreset.keymap && Array.isArray(loadedPreset.keymap)) {
        setKeymap(loadedPreset.keymap);
      }
    }
  }, [location.state]);

  const handleKeyClick = (index: number, shiftKey: boolean, ctrlKey: boolean) => {
    if (keymapMode) {
      setSelectedKeyForKeymap(index);
      return;
    }

    setSelectedKeys((prev) => {
      const newSet = new Set(prev);

      if (shiftKey && lastSelectedKey !== null) {
        const start = Math.min(lastSelectedKey, index);
        const end = Math.max(lastSelectedKey, index);
        for (let i = start; i <= end; i++) {
          newSet.add(i);
        }
      } else if (ctrlKey) {
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

    setLastSelectedKey(index);
  };

  const handleKeycodeSelect = (keyCode: string) => {
    if (selectedKeyForKeymap !== null) {
      setKeymap((prev) => {
        const newKeymap = [...prev];
        newKeymap[selectedKeyForKeymap] = keyCode;
        console.log(`Key ${selectedKeyForKeymap} changed to ${keyCode}`);
        return newKeymap;
      });
      setSelectedKeyForKeymap(null);
    }
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
    setKeyColors(DEFAULT_COLORS.map(c => [...c]));
    setSelectedKeys(new Set());
    toast.info('Colors reset to defaults');
  };

  const generateThumbnail = async (): Promise<string | null> => {
    try {
      const keyboardElement = document.querySelector('.keyboard-layout-container svg');
      if (!keyboardElement) return null;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const svgRect = keyboardElement.getBoundingClientRect();
      canvas.width = 800;
      canvas.height = 300;

      ctx.fillStyle = '#2A3B3C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const viewBox = keyboardElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 1000, 400];
      const [vbX, vbY, vbWidth, vbHeight] = viewBox;

      const scaleX = canvas.width / vbWidth;
      const scaleY = canvas.height / vbHeight;
      const scale = Math.min(scaleX, scaleY) * 0.9;

      const offsetX = (canvas.width - vbWidth * scale) / 2;
      const offsetY = (canvas.height - vbHeight * scale) / 2;

      const svgElements = keyboardElement.querySelectorAll('rect[data-key-index]');
      svgElements.forEach((rect) => {
        const index = parseInt(rect.getAttribute('data-key-index') || '0');
        const [h, s, v] = keyColors[index] || [0, 0, 0];

        if (v === 0 && s === 0) return;

        const x = (parseFloat(rect.getAttribute('x') || '0') - vbX) * scale + offsetX;
        const y = (parseFloat(rect.getAttribute('y') || '0') - vbY) * scale + offsetY;
        const width = parseFloat(rect.getAttribute('width') || '0') * scale;
        const height = parseFloat(rect.getAttribute('height') || '0') * scale;

        const hexColor = hsvToHex(h, s, v);
        ctx.fillStyle = hexColor;
        ctx.fillRect(x, y, width, height);
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.warning('Please sign in to save presets');
      return;
    }

    if (!presetName.trim()) {
      toast.warning('Please enter a preset name');
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
        toast.error('Keyboard model not found');
        return;
      }

      const thumbnail = await generateThumbnail();

      const rgbConfig = {
        colors: keyColors,
        timestamp: new Date().toISOString(),
      };

      const keymapConfig = {
        keymap: keymap,
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
          effect_config: effectConfig,
          keymap_config: keymapConfig,
          thumbnail_url: thumbnail,
          visibility: 'public',
        });

      if (error) throw error;

      toast.success('Preset saved successfully!');
      setPresetName('');
      setDescription('');
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      name: presetName || 'Untitled Preset',
      description: description,
      keyColors: keyColors,
      effect: effectConfig,
      keymap: keymap,
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
          if (data.effect) {
            setEffectConfig(data.effect);
          }
          if (data.keymap && Array.isArray(data.keymap)) {
            setKeymap(data.keymap);
          }
          toast.success('Preset imported successfully!');
        } else {
          toast.error('Invalid preset file format');
        }
      } catch (error) {
        console.error('Error importing:', error);
        toast.error('Failed to import preset');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const connectToKeyboard = async () => {
    try {
      if (!('hid' in navigator)) {
        toast.error('WebHID is not supported in your browser. Please use Chrome or Edge.');
        return;
      }

      const devices = await (navigator as any).hid.requestDevice({
        filters: [
          { vendorId: 0x1209, usagePage: 0xFF60, usage: 0x61 },
          { vendorId: 0x1209 },
          { usagePage: 0xFF60, usage: 0x61 }
        ]
      });

      if (devices.length === 0) {
        toast.warning('No device selected');
        return;
      }

      const selectedDevice = devices[0];

      console.log('Device Info:', {
        vendorId: '0x' + selectedDevice.vendorId.toString(16),
        productId: '0x' + selectedDevice.productId.toString(16),
        productName: selectedDevice.productName,
        collections: selectedDevice.collections
      });

      if (!selectedDevice.opened) {
        await selectedDevice.open();
      }

      setDevice(selectedDevice);
      setConnected(true);
      toast.success(`Connected to ${selectedDevice.productName || 'keyboard'}!`);
    } catch (error) {
      console.error('Error connecting to keyboard:', error);
      toast.error('Failed to connect to keyboard. Check console for details.');
    }
  };

  const disconnectFromKeyboard = async () => {
    if (device) {
      try {
        await device.close();
        setDevice(null);
        setConnected(false);
        toast.info('Disconnected from keyboard');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  };

  const sendEffectToKeyboard = async () => {
    if (!device || !connected) return;

    try {
      const effectModeMap: Record<string, number> = {
        'none': 0,
        'breathing': 2,
        'rainbow': 10,
        'wave': 11,
        'reactive': 13,
        'spiral': 15,
        'ripple': 17
      };

      const mode = effectModeMap[effectConfig.type] || 0;

      if (mode === 0) {
        const modeData = new Uint8Array(32);
        modeData[0] = 0x50;
        modeData[1] = 0;
        await device.sendReport(0x00, modeData);
      } else {
        const modeData = new Uint8Array(32);
        modeData[0] = 0x50;
        modeData[1] = mode;
        await device.sendReport(0x00, modeData);

        const speedData = new Uint8Array(32);
        speedData[0] = 0x53;
        speedData[1] = effectConfig.speed;
        await device.sendReport(0x00, speedData);

        const brightnessData = new Uint8Array(32);
        brightnessData[0] = 0x52;
        brightnessData[1] = effectConfig.intensity;
        await device.sendReport(0x00, brightnessData);
      }
    } catch (error) {
      console.error('Error sending effect to keyboard:', error);
      toast.error('Failed to apply effect to keyboard');
    }
  };

  const sendColorToKeyboard = async (keyIndex: number, h: number, s: number, v: number) => {
    if (!device || !connected) return;

    try {
      const data = new Uint8Array(32);
      data[0] = 0x60;
      data[1] = keyIndex;
      data[2] = h;
      data[3] = s;
      data[4] = v;

      await device.sendReport(0, data);
    } catch (error) {
      console.error('Error sending color to keyboard:', error);
    }
  };

  const keyIndexToMatrix = (keyIndex: number): { row: number; col: number } => {
    const KEY_TO_MATRIX = [
      [0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3],
      [0, 4], [1, 4], [0, 5], [1, 5], [0, 6], [1, 6], [0, 7], [1, 7],
      [2, 0], [3, 0], [2, 1], [3, 1], [2, 2], [3, 2], [2, 3], [3, 3],
      [2, 4], [3, 4], [2, 5], [3, 5], [2, 6], [3, 6], [3, 7],
      [4, 0], [4, 1], [5, 1], [4, 2], [5, 2], [4, 3], [5, 3], [4, 4],
      [5, 4], [4, 5], [5, 5], [4, 6], [5, 6], [5, 7],
      [6, 0], [7, 0], [6, 1], [7, 1], [6, 2], [7, 2], [6, 3], [7, 3],
      [6, 4], [7, 4], [6, 5], [7, 5], [6, 7], [4, 7], [7, 7],
      [8, 0], [9, 0], [8, 1], [9, 1], [8, 2], [9, 2], [8, 3], [9, 3],
      [8, 4], [9, 4], [8, 5], [9, 5], [9, 6], [8, 7], [9, 7],
      [10, 0], [11, 0], [11, 1], [10, 1], [10, 5], [11, 5], [10, 6], [11, 6],
      [10, 7], [11, 7]
    ];

    if (keyIndex < 0 || keyIndex >= KEY_TO_MATRIX.length) {
      console.error(`⚠️ Invalid keyIndex ${keyIndex}. Valid range: 0-${KEY_TO_MATRIX.length - 1}`);
      return { row: 0, col: 0 };
    }

    return { row: KEY_TO_MATRIX[keyIndex][0], col: KEY_TO_MATRIX[keyIndex][1] };
  };

  const sendKeycodeToKeyboard = async (keyIndex: number, keycode: number, layer: number = 0) => {
    if (!device || !connected) return;

    try {
      const data = new Uint8Array(32);
      data[0] = 0x05;
      data[1] = layer;
      data[2] = keyIndex;
      data[3] = (keycode >> 8) & 0xFF;
      data[4] = keycode & 0xFF;

      console.log('🔍 DEBUG: Sending keycode command (FIXED FORMAT)', {
        keyIndex,
        keycode: '0x' + keycode.toString(16).padStart(4, '0'),
        layer,
        commandByte: '0x' + data[0].toString(16),
        fullPacket: Array.from(data.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
      });

      await device.sendReport(0, data);

      // Try to read response from keyboard
      try {
        device.addEventListener('inputreport', (event: any) => {
          console.log('📥 Response from keyboard:', {
            reportId: event.reportId,
            data: Array.from(new Uint8Array(event.data.buffer)).map((b: number) => '0x' + b.toString(16).padStart(2, '0')).join(' ')
          });
        }, { once: true });

        // Wait a bit for potential response
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.log('⚠️ No response from keyboard (this might be normal)');
      }

      console.log(`✅ Sent keycode 0x${keycode.toString(16)} to key ${keyIndex} on layer ${layer}`);
    } catch (error) {
      console.error('❌ Error sending keycode to keyboard:', error);
      throw error;
    }
  };

  const syncAllColorsToKeyboard = async () => {
    if (!device || !connected) {
      toast.warning('Please connect to keyboard first');
      return;
    }

    try {
      for (let i = 0; i < keyColors.length; i++) {
        await sendColorToKeyboard(i, keyColors[i][0], keyColors[i][1], keyColors[i][2]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      toast.success('All colors synced to keyboard!');
    } catch (error) {
      console.error('Error syncing colors:', error);
      toast.error('Failed to sync colors to keyboard');
    }
  };

  const syncKeymapToKeyboard = async () => {
    if (!device || !connected) {
      toast.warning('Please connect to keyboard first');
      return;
    }

    console.log('🚀 Starting keymap sync...');
    console.log('📊 Current keymap:', keymap);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < keymap.length; i++) {
        const keycodeValue = keycodeToHex(keymap[i]);

        console.log(`\n--- Key ${i}/${keymap.length - 1} ---`);
        console.log('Keycode string:', keymap[i]);
        console.log('Converted to hex:', '0x' + keycodeValue.toString(16).padStart(4, '0'));

        try {
          await sendKeycodeToKeyboard(i, keycodeValue, 0);
          successCount++;
        } catch (err) {
          console.error(`Failed to send key ${i}:`, err);
          errorCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 25));
      }

      console.log(`\n✅ Keymap sync complete: ${successCount} success, ${errorCount} errors`);

      if (errorCount === 0) {
        toast.success(`Keymap synced! ${successCount} keys updated`);
      } else {
        toast.warning(`Synced with ${errorCount} errors. Check console.`);
      }
    } catch (error) {
      console.error('❌ Critical error syncing keymap:', error);
      toast.error('Failed to sync keymap to keyboard');
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
              keymap={keymap}
              keymapMode={keymapMode}
              showIndexes={showIndexes}
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
                      Connected to {device?.productName || 'keyboard'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={syncAllColorsToKeyboard}
                        className="flex-1 bg-brand-beige hover:bg-brand-beige/90 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Usb className="w-4 h-4" />
                        Sync All Keys
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
                  <>
                    <button
                      onClick={connectToKeyboard}
                      className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Usb className="w-5 h-5" />
                      Connect to Keyboard
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const devices = await (navigator as any).hid.requestDevice({ filters: [] });
                          if (devices.length > 0) {
                            const dev = devices[0];
                            console.log('Selected device:', dev);
                            if (!dev.opened) {
                              await dev.open();
                            }
                            setDevice(dev);
                            setConnected(true);
                            toast.success(`Connected to ${dev.productName || 'device'}!`);
                          }
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Failed to connect');
                        }
                      }}
                      className="w-full bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-2 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2 text-sm"
                    >
                      Show All HID Devices
                    </button>
                  </>
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

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleSave}
                    disabled={saving || !user}
                    className="flex-1 min-w-[200px] bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save to Cloud'}
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="flex-1 min-w-[200px] bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-3 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2"
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
            <KeymapControls
              keymapMode={keymapMode}
              onToggleMode={setKeymapMode}
              connected={connected}
              onSyncKeymap={syncKeymapToKeyboard}
            />

            <KeymapDebugger
              device={device}
              connected={connected}
              onSendCommand={sendKeycodeToKeyboard}
              showIndexes={showIndexes}
              onToggleIndexes={setShowIndexes}
            />

            <RGBControls
              selectedKeys={selectedKeys}
              keyColors={keyColors}
              onColorChange={handleColorChange}
              onClearSelection={handleClearSelection}
              onResetColors={handleResetColors}
            />

            <EffectControls
              effectConfig={effectConfig}
              onEffectChange={setEffectConfig}
            />

            {connected && (
              <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
                <button
                  onClick={sendEffectToKeyboard}
                  className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Usb className="w-6 h-6" />
                  Apply Effect to Keyboard
                </button>
                <p className="text-brand-sage text-xs mt-2 text-center">
                  Sends the current effect configuration to your keyboard
                </p>
              </div>
            )}

            {selectedKeys.size > 0 && connected && (
              <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
                <button
                  onClick={async () => {
                    for (const index of selectedKeys) {
                      await sendColorToKeyboard(index, keyColors[index][0], keyColors[index][1], keyColors[index][2]);
                    }
                    toast.success(`Applied colors to ${selectedKeys.size} key${selectedKeys.size > 1 ? 's' : ''}!`);
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

      {selectedKeyForKeymap !== null && (
        <KeycodeSelector
          currentKeyCode={keymap[selectedKeyForKeymap]}
          onSelect={handleKeycodeSelect}
          onClose={() => setSelectedKeyForKeymap(null)}
        />
      )}
    </div>
  );
}
