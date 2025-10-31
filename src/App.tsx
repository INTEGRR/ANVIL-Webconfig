import { useState, useEffect } from 'react';
import { Bluetooth, Power, Palette, Zap, Sun, Keyboard, Save, Upload, Download } from 'lucide-react';
import KeyboardLayout from './components/KeyboardLayout';

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

  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [keyColors, setKeyColors] = useState<KeyColor[]>(
    Array(85).fill({ h: 0, s: 255, v: 220 })
  );
  const [pickerHSV, setPickerHSV] = useState({ h: 0, s: 255, v: 220 });
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<any[]>([]);

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

  const handleKeyClick = (keyIndex: number) => {
    setSelectedKey(keyIndex);
    setPickerHSV(keyColors[keyIndex] || { h: 0, s: 255, v: 220 });
  };

  const applyColorToKey = () => {
    if (selectedKey !== null) {
      setKeyColor(selectedKey, pickerHSV.h, pickerHSV.s, pickerHSV.v);
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
    setKeyColors(presetColors);
    await uploadBulkColors(presetColors);
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
          setKeyColors(config.keyColors);
          await uploadBulkColors(config.keyColors);
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
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Anvil Native RGB Control
          </h1>
          <p className="text-slate-400">Configure your keyboard lighting in real-time</p>
        </header>

        {!status.connected ? (
          <div className="bg-slate-800 rounded-2xl p-12 text-center shadow-2xl border border-slate-700">
            <Bluetooth className="w-16 h-16 mx-auto mb-6 text-blue-400" />
            <h2 className="text-2xl font-semibold mb-4">Connect Your Anvil Native</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Make sure your keyboard is connected via USB and you've flashed the firmware with RAW_HID enabled.
            </p>
            <button
              onClick={connectKeyboard}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-blue-500/50"
            >
              Connect Keyboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <Power className="w-6 h-6 text-green-400" />
                  Status
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">RGB Lighting</span>
                  <button
                    onClick={toggleRGB}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      status.enabled ? 'bg-green-500' : 'bg-slate-600'
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

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Palette className="w-6 h-6 text-cyan-400" />
                Color
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-slate-300">
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
                  <label className="block text-sm font-medium mb-3 text-slate-300">
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

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Sun className="w-6 h-6 text-yellow-400" />
                Brightness
              </h2>

              <div>
                <label className="block text-sm font-medium mb-3 text-slate-300">
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

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-orange-400" />
                Effect Speed
              </h2>

              <div>
                <label className="block text-sm font-medium mb-3 text-slate-300">
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

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-green-400" />
                Per-Key RGB Control
              </h2>

              <div className="mb-6 overflow-x-auto">
                <KeyboardLayout onKeyClick={handleKeyClick} keyColors={keyColorStrings} />
              </div>

              {selectedKey !== null && (
                <div className="bg-slate-700 rounded-xl p-4 space-y-4">
                  <h3 className="text-lg font-semibold text-cyan-400">
                    Key {selectedKey} Selected
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
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
                      <label className="block text-sm font-medium mb-2 text-slate-300">
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
                      <label className="block text-sm font-medium mb-2 text-slate-300">
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
                      className="w-full bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Apply Color to Key {selectedKey}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Save className="w-6 h-6 text-yellow-400" />
                Presets & Configuration
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-cyan-400 outline-none"
                  />
                  <button
                    onClick={() => presetName && savePreset(presetName)}
                    className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Save Preset
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportConfig}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export Config
                  </button>
                  <label className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
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
                    <h3 className="text-lg font-semibold mb-3 text-slate-300">Saved Presets</h3>
                    <div className="space-y-2">
                      {savedPresets.map((preset, index) => (
                        <div
                          key={index}
                          className="bg-slate-700 rounded-lg p-3 flex items-center justify-between"
                        >
                          <span className="text-white font-medium">{preset.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadPreset(preset.colors)}
                              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-1 rounded text-sm font-medium transition-colors"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => deletePreset(index)}
                              className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm font-medium transition-colors"
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

            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-2xl font-semibold mb-6">RGB Effects</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rgbModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setRGBMode(mode.id)}
                    className={`p-4 rounded-lg font-medium transition-all ${
                      status.mode === mode.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
