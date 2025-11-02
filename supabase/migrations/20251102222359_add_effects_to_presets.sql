/*
  # Add effects support to presets

  1. Changes
    - Add `effect_config` column to `presets` table to store effect settings
    - Column stores effect type (e.g., 'breathing', 'reactive', 'wave') and parameters

  2. Structure
    - effect_config (jsonb) contains:
      - type: string (none, breathing, reactive, wave, rainbow, etc.)
      - speed: number (1-255)
      - intensity: number (1-255)
      - direction: string (left, right, up, down, center-out)
      - parameters: object (effect-specific settings)
*/

-- Add effect_config column to presets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presets' AND column_name = 'effect_config'
  ) THEN
    ALTER TABLE presets ADD COLUMN effect_config jsonb DEFAULT '{"type": "none", "speed": 128, "intensity": 255}'::jsonb;
  END IF;
END $$;
