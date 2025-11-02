import { Sparkles } from 'lucide-react';
import { EffectConfig, EFFECT_OPTIONS, EffectType, EffectDirection } from '../types/effects';

interface EffectControlsProps {
  effectConfig: EffectConfig;
  onEffectChange: (config: EffectConfig) => void;
}

export default function EffectControls({ effectConfig, onEffectChange }: EffectControlsProps) {
  const handleTypeChange = (type: EffectType) => {
    onEffectChange({ ...effectConfig, type });
  };

  const handleSpeedChange = (speed: number) => {
    onEffectChange({ ...effectConfig, speed });
  };

  const handleIntensityChange = (intensity: number) => {
    onEffectChange({ ...effectConfig, intensity });
  };

  const handleDirectionChange = (direction: EffectDirection) => {
    onEffectChange({ ...effectConfig, direction });
  };

  const needsDirection = ['wave', 'spiral'].includes(effectConfig.type);

  return (
    <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-brand-beige" />
        Lighting Effects
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-blue mb-2">
            Effect Type
          </label>
          <select
            value={effectConfig.type}
            onChange={(e) => handleTypeChange(e.target.value as EffectType)}
            className="w-full bg-brand-teal/60 text-white px-4 py-2.5 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
          >
            {EFFECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-brand-sage text-xs mt-1">
            {EFFECT_OPTIONS.find(opt => opt.value === effectConfig.type)?.description}
          </p>
        </div>

        {effectConfig.type !== 'none' && (
          <>
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Speed: {effectConfig.speed}
              </label>
              <input
                type="range"
                min="1"
                max="255"
                value={effectConfig.speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="w-full h-2 bg-brand-teal/60 rounded-lg appearance-none cursor-pointer accent-brand-beige"
              />
              <div className="flex justify-between text-xs text-brand-sage mt-1">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Intensity: {effectConfig.intensity}
              </label>
              <input
                type="range"
                min="1"
                max="255"
                value={effectConfig.intensity}
                onChange={(e) => handleIntensityChange(Number(e.target.value))}
                className="w-full h-2 bg-brand-teal/60 rounded-lg appearance-none cursor-pointer accent-brand-beige"
              />
              <div className="flex justify-between text-xs text-brand-sage mt-1">
                <span>Subtle</span>
                <span>Intense</span>
              </div>
            </div>

            {needsDirection && (
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['left', 'right', 'up', 'down', 'center-out', 'radial'] as EffectDirection[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => handleDirectionChange(dir)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                        effectConfig.direction === dir
                          ? 'bg-brand-beige text-white'
                          : 'bg-brand-teal/60 text-brand-blue hover:bg-brand-teal/80 border border-brand-sage/30'
                      }`}
                    >
                      {dir.charAt(0).toUpperCase() + dir.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {effectConfig.type === 'none' && (
          <div className="text-center py-6 text-brand-sage">
            <p className="text-sm">Select an effect type to configure animation settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
