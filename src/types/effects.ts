export type EffectType =
  | 'none'
  | 'breathing'
  | 'reactive'
  | 'wave'
  | 'rainbow'
  | 'spiral'
  | 'ripple';

export type EffectDirection = 'left' | 'right' | 'up' | 'down' | 'center-out' | 'radial';

export interface EffectConfig {
  type: EffectType;
  speed: number;
  intensity: number;
  direction?: EffectDirection;
  parameters?: Record<string, any>;
}

export const DEFAULT_EFFECT_CONFIG: EffectConfig = {
  type: 'none',
  speed: 128,
  intensity: 255,
};

export const EFFECT_OPTIONS: { value: EffectType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Static colors, no animation' },
  { value: 'breathing', label: 'Breathing', description: 'Smooth fade in and out' },
  { value: 'reactive', label: 'Reactive', description: 'Light up on keypress' },
  { value: 'wave', label: 'Wave', description: 'Color wave across keyboard' },
  { value: 'rainbow', label: 'Rainbow', description: 'Cycling rainbow effect' },
  { value: 'spiral', label: 'Spiral', description: 'Spiral pattern from center' },
  { value: 'ripple', label: 'Ripple', description: 'Ripple effect on keypress' },
];
