import { useState, useEffect } from 'react';
import { Bluetooth, Power, Palette, Zap, Sun, Keyboard, Save, Upload, Download, ImageIcon } from 'lucide-react';
import KeyboardLayout from './components/KeyboardLayout';
import KeyboardVisualizer from './components/KeyboardVisualizer';
import KeyboardVisualizer3D from './components/KeyboardVisualizer3D';

interface KeyboardStatus {
  connected: boolean;
  mode: number;
  hue: number;
  saturation: number;
  brightness: number;
  speed: number;
  enabled: boolean;
}

interface KeyColor {
  h: number;
  s: number;
  v: number;
}

function hsvToRgbString(h: number, s: number, v: number): string {
  const hNorm = (h / 255) * 360;
  const sNorm = s / 255;
  const vNorm = v / 255;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = vNorm - c;

  let r = 0, g = 0, b = 0;
  if (hNorm >= 0 && hNorm < 60) { r = c; g = x; b = 0; }
  else if (hNorm >= 60 && hNorm < 120) { r = x; g = c; b = 0; }
  else if (hNorm >= 120 && hNorm < 180) { r = 0; g = c; b = x; }
  else if (hNorm >= 180 && hNorm < 240) { r = 0; g = x; b = c; }
  else if (hNorm >= 240 && hNorm < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
}

function App() {
  const [device, setDevice] = useState<HIDDevice | null>(null);
  const [status, setStatus] = useState<KeyboardStatus>({
    connected: false,
    mode: 0,
    hue: 0,
    saturation: 255,
    brightness: 220,
    speed: 40,
    enabled: true,
  });

  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [keyColors, setKeyColors] = useState<KeyColor[]>(
    Array.from({ length: 85 }, () => ({ h: 0, s: 255, v: 220 }))
  );
  const [pickerHSV, setPickerHSV] = useState({ h: 0, s: 255, v: 220 });
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<any[]>([]);
  const [visualizerMode, setVisualizerMode] = useState<'3d' | 'photo' | 'layout'>('3d');

  useEffect(() => {
    setSavedPresets(getPresets());
  }, []);

  const connectKeyboard = async () => {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ usagePage: 0xFF60, usage: 0x61 }],
      });

      if (devices.length > 0) {
        const selectedDevice = devices[0];
        await selectedDevice.open();
        setDevice(selectedDevice);
        setStatus(prev => ({ ...prev, connected: true }));

        selectedDevice.addEventListener('inputreport', (event: HIDInputReportEvent) => {
          const { data } = event;
          const view = new Uint8Array(data.buffer);

          if (view[0] === 0x10) {
            setStatus(prev => ({
              ...prev,
              mode: view[1],
              hue: view[2],
              saturation: view[3],
              brightness: view[4],
              speed: view[5],
              enabled: view[6] === 1,
            }));
          }
        });

        requestStatus(selectedDevice);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to keyboard. Make sure your firmware supports RAW_HID.');
    }
  };

  const requestStatus = async (dev: HIDDevice) => {
    const report = new Uint8Array(32);
    report[0] = 0x10;
    await dev.sendReport(0, report);
  };

  const sendCommand = async (cmd: number, ...params: number[]) => {
    if (!device) return;

    const report = new Uint8Array(32);
    report[0] = cmd;
    params.forEach((param, index) => {
      report[index + 1] = param;
    });

    await device.sendReport(0, report);
  };

  const setRGBMode = (mode: number) => {
    sendCommand(0x01, mode);
    setStatus(prev => ({ ...prev, mode }));
  };

  const setHSV = (h: number, s: number, v: number) => {
    sendCommand(0x02, h, s, v);
    setStatus(prev => ({ ...prev, hue: h, saturation: s, brightness: v }));
  };

  const setBrightness = (brightness: number) => {
    sendCommand(0x03, brightness);
    setStatus(prev => ({ ...prev, brightness }));
  };

  const setSpeed = (speed: number) => {
    sendCommand(0x04, speed);
    setStatus(prev => ({ ...prev, speed }));
  };

  const toggleRGB = () => {
    sendCommand(0x05);
    setStatus(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const setKeyColor = (keyIndex: number, h: number, s: number, v: number) => {
    sendCommand(0x20, keyIndex, h, s, v);
    setKeyColors(prev => {
      const newColors = [...prev];
      newColors[keyIndex] = { h, s, v };
      return newColors;
    });
  };

  const loadKeyColorsFromKeyboard = async () => {
    if (!device) return;

    const newColors: KeyColor[] = [];

    // Request colors in chunks of 7 keys
    for (let start = 0; start < 85; start += 7) {
      const count = Math.min(7, 85 - start);
      const report = new Uint8Array(32);
      report[0] = 0x30; // Get key colors
      report[1] = start;
      report[2] = count;

      await device.sendReport(0, report);

      // Wait for response (this is a simplified approach)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const uploadBulkColors = async (colors: KeyColor[]) => {
    if (!device) return;

    // Upload in chunks of 10 keys
    for (let i = 0; i < colors.length; i += 10) {
      const chunk = colors.slice(i, Math.min(i + 10, colors.length));
      const report = new Uint8Array(32);
      report[0] = 0x21; // Bulk set
      report[1] = chunk.length;

      chunk.forEach((color, idx) => {
        const offset = 2 + (idx * 4);
        report[offset] = i + idx; // key index
        report[offset + 1] = color.h;
        report[offset + 2] = color.s;
        report[offset + 3] = color.v;
      });

      await device.sendReport(0, report);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  const handleKeyClick = (keyIndex: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && selectedKeys.size > 0) {
      // Shift: select range from first selected to current
      const firstSelected = Math.min(...Array.from(selectedKeys));
      const start = Math.min(firstSelected, keyIndex);
      const end = Math.max(firstSelected, keyIndex);
      const newSelection = new Set(selectedKeys);
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedKeys(newSelection);
    } else if (event?.ctrlKey || event?.metaKey) {
      // Ctrl/Cmd: toggle single key
      const newSelection = new Set(selectedKeys);
      if (newSelection.has(keyIndex)) {
        newSelection.delete(keyIndex);
      } else {
        newSelection.add(keyIndex);
      }
      setSelectedKeys(newSelection);
    } else {
      // Normal click: select only this key
      setSelectedKeys(new Set([keyIndex]));
    }

    // Update picker to first selected key's color
    const firstKey = event?.ctrlKey || event?.metaKey ? keyIndex : (selectedKeys.size > 0 ? Math.min(...Array.from(selectedKeys)) : keyIndex);
    setPickerHSV(keyColors[firstKey] || { h: 0, s: 255, v: 220 });
  };

  const applyColorToKey = async () => {
    if (selectedKeys.size === 0) return;

    // Apply to all selected keys
    for (const keyIndex of Array.from(selectedKeys)) {
      setKeyColor(keyIndex, pickerHSV.h, pickerHSV.s, pickerHSV.v);
    }
  };

  const savePreset = (name: string) => {
    const preset = {
      name,
      colors: keyColors,
      timestamp: Date.now(),
    };
    const presets = JSON.parse(localStorage.getItem('rgbPresets') || '[]');
    presets.push(preset);
    localStorage.setItem('rgbPresets', JSON.stringify(presets));
    setSavedPresets(presets);
    setPresetName('');
  };

  const loadPreset = async (presetColors: KeyColor[]) => {
    // Ensure all 85 keys are present
    const fullColors = Array.from({ length: 85 }, (_, i) =>
      presetColors[i] || { h: 0, s: 255, v: 220 }
    );
    setKeyColors(fullColors);
    if (device) {
      await uploadBulkColors(fullColors);
    }
  };

  const deletePreset = (index: number) => {
    const presets = getPresets();
    presets.splice(index, 1);
    localStorage.setItem('rgbPresets', JSON.stringify(presets));
    setSavedPresets(presets);
  };

  const getPresets = () => {
    return JSON.parse(localStorage.getItem('rgbPresets') || '[]');
  };

  const exportConfig = () => {
    const config = {
      keyColors,
      status,
      timestamp: Date.now(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyboard-rgb-config-${Date.now()}.json`;
    a.click();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (config.keyColors) {
          // Ensure all 85 keys are present
          const fullColors = Array.from({ length: 85 }, (_, i) =>
            config.keyColors[i] || { h: 0, s: 255, v: 220 }
          );
          setKeyColors(fullColors);
          if (device) {
            await uploadBulkColors(fullColors);
          }
        }
      } catch (err) {
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  const keyColorStrings = keyColors.map(color => hsvToRgbString(color.h, color.s, color.v));

  const rgbModes = [
    { id: 0, name: 'Per-Key Colors' },
    { id: 1, name: 'Solid Color' },
    { id: 2, name: 'Alphas Mods' },
    { id: 3, name: 'Gradient Up/Down' },
    { id: 4, name: 'Gradient Left/Right' },
    { id: 5, name: 'Breathing' },
    { id: 6, name: 'Band Spiral' },
    { id: 7, name: 'Cycle All' },
    { id: 8, name: 'Cycle Left/Right' },
    { id: 9, name: 'Cycle Up/Down' },
    { id: 10, name: 'Rainbow Moving' },
    { id: 11, name: 'Dual Beacon' },
    { id: 12, name: 'Rainbow Beacon' },
    { id: 13, name: 'Jellybean Raindrops' },
    { id: 14, name: 'Typing Heatmap' },
    { id: 15, name: 'Digital Rain' },
    { id: 16, name: 'Reactive Simple' },
    { id: 17, name: 'Reactive Splash' },
  ];

  return (
    <div className="min-h-screen bg-brand-brown text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-brand-beige to-brand-teal bg-clip-text text-transparent">
            Anvil Native RGB Control
          </h1>
          <p className="text-brand-sage">Configure your keyboard lighting in real-time</p>
        </header>

        {!status.connected ? (
          <div className="bg-brand-teal rounded-2xl p-12 text-center shadow-2xl border border-brand-sage/20">
            <Bluetooth className="w-16 h-16 mx-auto mb-6 text-brand-beige" />
            <h2 className="text-2xl font-semibold mb-4">Connect Your Anvil Native</h2>
            <p className="text-brand-sage mb-8 max-w-md mx-auto">
              Make sure your keyboard is connected via USB and you've flashed the firmware with RAW_HID enabled.
            </p>
            <button
              onClick={connectKeyboard}
              className="bg-brand-beige hover:bg-brand-beige/90 px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-brand-beige/30"
            >
              Connect Keyboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <Power className="w-6 h-6 text-brand-beige" />
                  Status
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-brand-sage">RGB Lighting</span>
                  <button
                    onClick={toggleRGB}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      status.enabled ? 'bg-brand-beige' : 'bg-brand-sage'
                    }`}
                  >
                    <div
                      className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-transform ${
                        status.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Palette className="w-6 h-6 text-brand-beige" />
                Color
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-brand-blue">
                    Hue: {status.hue}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={status.hue}
                    onChange={(e) => setHSV(parseInt(e.target.value), status.saturation, status.brightness)}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right,
                        hsl(0, 100%, 50%),
                        hsl(60, 100%, 50%),
                        hsl(120, 100%, 50%),
                        hsl(180, 100%, 50%),
                        hsl(240, 100%, 50%),
                        hsl(300, 100%, 50%),
                        hsl(360, 100%, 50%))`,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3 text-brand-blue">
                    Saturation: {status.saturation}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={status.saturation}
                    onChange={(e) => setHSV(status.hue, parseInt(e.target.value), status.brightness)}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-gray-400 to-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Sun className="w-6 h-6 text-brand-beige" />
                Brightness
              </h2>

              <div>
                <label className="block text-sm font-medium mb-3 text-brand-blue">
                  Level: {status.brightness}
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={status.brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-slate-700 to-yellow-400"
                />
              </div>
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-brand-beige" />
                Effect Speed
              </h2>

              <div>
                <label className="block text-sm font-medium mb-3 text-brand-blue">
                  Speed: {status.speed}
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={status.speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-blue-900 to-red-500"
                />
              </div>
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <Keyboard className="w-6 h-6 text-brand-beige" />
                  Per-Key RGB Control
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisualizerMode('3d')}
                    className={`px-4 py-2 rounded-lg transition-colors border ${
                      visualizerMode === '3d'
                        ? 'bg-brand-beige text-brand-brown'
                        : 'bg-brand-teal/60 hover:bg-brand-teal/40 border-brand-sage/20'
                    }`}
                  >
                    3D View
                  </button>
                  <button
                    onClick={() => setVisualizerMode('photo')}
                    className={`px-4 py-2 rounded-lg transition-colors border ${
                      visualizerMode === 'photo'
                        ? 'bg-brand-beige text-brand-brown'
                        : 'bg-brand-teal/60 hover:bg-brand-teal/40 border-brand-sage/20'
                    }`}
                  >
                    Photo
                  </button>
                  <button
                    onClick={() => setVisualizerMode('layout')}
                    className={`px-4 py-2 rounded-lg transition-colors border ${
                      visualizerMode === 'layout'
                        ? 'bg-brand-beige text-brand-brown'
                        : 'bg-brand-teal/60 hover:bg-brand-teal/40 border-brand-sage/20'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <div className="mb-6 overflow-x-auto flex justify-center">
                {visualizerMode === '3d' ? (
                  <KeyboardVisualizer3D onKeyClick={handleKeyClick} keyColors={keyColorStrings} selectedKeys={selectedKeys} />
                ) : visualizerMode === 'photo' ? (
                  <KeyboardVisualizer onKeyClick={handleKeyClick} keyColors={keyColorStrings} selectedKeys={selectedKeys} />
                ) : (
                  <KeyboardLayout onKeyClick={handleKeyClick} keyColors={keyColorStrings} selectedKeys={selectedKeys} />
                )}
              </div>

              {selectedKeys.size > 0 && (
                <div className="bg-brand-teal/60 rounded-xl p-4 space-y-4 border border-brand-sage/20">
                  <h3 className="text-lg font-semibold text-brand-beige">
                    {selectedKeys.size === 1
                      ? `Key ${Array.from(selectedKeys)[0]} Selected`
                      : `${selectedKeys.size} Keys Selected (${Array.from(selectedKeys).sort((a, b) => a - b).slice(0, 5).join(', ')}${selectedKeys.size > 5 ? '...' : ''})`
                    }
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-brand-blue">
                        Hue: {pickerHSV.h}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={pickerHSV.h}
                        onChange={(e) => setPickerHSV({ ...pickerHSV, h: parseInt(e.target.value) })}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right,
                            hsl(0, 100%, 50%),
                            hsl(60, 100%, 50%),
                            hsl(120, 100%, 50%),
                            hsl(180, 100%, 50%),
                            hsl(240, 100%, 50%),
                            hsl(300, 100%, 50%),
                            hsl(360, 100%, 50%))`,
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-brand-blue">
                        Saturation: {pickerHSV.s}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={pickerHSV.s}
                        onChange={(e) => setPickerHSV({ ...pickerHSV, s: parseInt(e.target.value) })}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-gray-400 to-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-brand-blue">
                        Brightness: {pickerHSV.v}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={pickerHSV.v}
                        onChange={(e) => setPickerHSV({ ...pickerHSV, v: parseInt(e.target.value) })}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-slate-700 to-yellow-400"
                      />
                    </div>

                    <button
                      onClick={applyColorToKey}
                      className="w-full bg-brand-beige hover:bg-brand-beige/90 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Apply Color to {selectedKeys.size === 1 ? 'Key' : `${selectedKeys.size} Keys`}
                    </button>

                    <div className="text-xs text-brand-sage mt-2 space-y-1">
                      <p>💡 <strong>Shift + Click:</strong> Select range</p>
                      <p>💡 <strong>Ctrl/Cmd + Click:</strong> Toggle selection</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Save className="w-6 h-6 text-brand-beige" />
                Presets & Configuration
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="flex-1 bg-brand-teal/60 text-white px-4 py-2 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none placeholder:text-brand-sage"
                  />
                  <button
                    onClick={() => presetName && savePreset(presetName)}
                    className="bg-brand-beige hover:bg-brand-beige/90 px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Save Preset
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportConfig}
                    className="flex-1 bg-brand-teal/60 hover:bg-brand-teal/40 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-brand-sage/20"
                  >
                    <Download className="w-5 h-5" />
                    Export Config
                  </button>
                  <label className="flex-1 bg-brand-teal/60 hover:bg-brand-teal/40 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border border-brand-sage/20">
                    <Upload className="w-5 h-5" />
                    Import Config
                    <input
                      type="file"
                      accept=".json"
                      onChange={importConfig}
                      className="hidden"
                    />
                  </label>
                </div>

                {savedPresets.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-brand-blue">Saved Presets</h3>
                    <div className="space-y-2">
                      {savedPresets.map((preset, index) => (
                        <div
                          key={index}
                          className="bg-brand-teal/60 rounded-lg p-3 flex items-center justify-between border border-brand-sage/20"
                        >
                          <span className="text-white font-medium">{preset.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadPreset(preset.colors)}
                              className="bg-brand-beige hover:bg-brand-beige/90 px-4 py-1 rounded text-sm font-medium transition-colors"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deletePreset(index)}
                              className="bg-brand-sage hover:bg-brand-sage/80 px-4 py-1 rounded text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-brand-teal rounded-2xl p-6 shadow-xl border border-brand-sage/20">
              <h2 className="text-2xl font-semibold mb-6">RGB Effects</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rgbModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setRGBMode(mode.id)}
                    className={`p-4 rounded-lg font-medium transition-all ${
                      status.mode === mode.id
                        ? 'bg-brand-beige text-white shadow-lg shadow-brand-beige/30'
                        : 'bg-brand-teal/60 text-brand-blue hover:bg-brand-teal/40 border border-brand-sage/20'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
