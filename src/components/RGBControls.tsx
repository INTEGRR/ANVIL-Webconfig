import { Palette, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import { hsvToHex, hexToRgb, rgbToHsv } from '../utils/colorUtils';

interface RGBControlsProps {
  selectedKeys: Set<number>;
  keyColors: number[][];
  onColorChange: (h: number, s: number, v: number) => void;
  onClearSelection: () => void;
  onResetColors: () => void;
}

export default function RGBControls({
  selectedKeys,
  keyColors,
  onColorChange,
  onClearSelection,
  onResetColors,
}: RGBControlsProps) {
  const selectedKey = selectedKeys.size === 1 ? Array.from(selectedKeys)[0] : null;
  const currentColor = selectedKey !== null ? keyColors[selectedKey] : null;

  const handleHexChange = (hex: string) => {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    onColorChange(hsv.h, hsv.s, hsv.v);
  };

  const presetColors = [
    { name: 'Red', h: 0, s: 255, v: 255 },
    { name: 'Orange', h: 42, s: 255, v: 255 },
    { name: 'Yellow', h: 64, s: 255, v: 255 },
    { name: 'Green', h: 85, s: 255, v: 255 },
    { name: 'Cyan', h: 127, s: 255, v: 255 },
    { name: 'Blue', h: 170, s: 255, v: 255 },
    { name: 'Purple', h: 212, s: 255, v: 255 },
    { name: 'Pink', h: 234, s: 255, v: 255 },
    { name: 'White', h: 0, s: 0, v: 255 },
    { name: 'Gray', h: 0, s: 0, v: 128 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-brand-beige" />
          <h2 className="text-lg font-bold text-white">RGB Controls</h2>
        </div>

        {selectedKeys.size === 0 ? (
          <p className="text-brand-sage text-sm">Select a key to customize its color</p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-brand-blue text-sm mb-2">
                {selectedKeys.size} key{selectedKeys.size > 1 ? 's' : ''} selected
              </p>
              <button
                onClick={onClearSelection}
                className="text-brand-sage hover:text-brand-beige text-sm flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear selection
              </button>
            </div>

            {currentColor && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Hue ({currentColor[0]})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentColor[0]}
                    onChange={(e) => onColorChange(parseInt(e.target.value), currentColor[1], currentColor[2])}
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right,
                        ${hsvToHex(0, 255, 255)},
                        ${hsvToHex(42, 255, 255)},
                        ${hsvToHex(85, 255, 255)},
                        ${hsvToHex(127, 255, 255)},
                        ${hsvToHex(170, 255, 255)},
                        ${hsvToHex(212, 255, 255)},
                        ${hsvToHex(255, 255, 255)})`,
                    }}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Saturation ({currentColor[1]})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentColor[1]}
                    onChange={(e) => onColorChange(currentColor[0], parseInt(e.target.value), currentColor[2])}
                    className="w-full"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Value/Brightness ({currentColor[2]})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={currentColor[2]}
                    onChange={(e) => onColorChange(currentColor[0], currentColor[1], parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Hex Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={hsvToHex(currentColor[0], currentColor[1], currentColor[2])}
                      onChange={(e) => handleHexChange(e.target.value)}
                      className="w-12 h-12 rounded border border-brand-sage/30 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={hsvToHex(currentColor[0], currentColor[1], currentColor[2])}
                      onChange={(e) => handleHexChange(e.target.value)}
                      className="flex-1 bg-brand-teal/60 text-white px-3 py-2 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {selectedKeys.size > 0 && (
        <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-beige" />
            <h3 className="text-lg font-bold text-white">Preset Colors</h3>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onColorChange(preset.h, preset.s, preset.v)}
                className="aspect-square rounded-lg border-2 border-brand-sage/30 hover:border-brand-beige transition-colors"
                style={{ backgroundColor: hsvToHex(preset.h, preset.s, preset.v) }}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
        <button
          onClick={onResetColors}
          className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-lg font-semibold transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Reset to Default Colors
        </button>
      </div>

      <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
        <h3 className="text-sm font-bold text-white mb-3">Tips</h3>
        <ul className="space-y-2 text-brand-blue text-sm">
          <li>• Click keys to select them</li>
          <li>• Hold Shift to select multiple</li>
          <li>• Drag sliders to adjust color</li>
          <li>• Use preset colors for quick styling</li>
        </ul>
      </div>
    </div>
  );
}
