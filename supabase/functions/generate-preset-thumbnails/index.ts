import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function generateSimpleThumbnail(colors: number[][]): string {
  const width = 800;
  const height = 300;
  const keyWidth = 40;
  const keyHeight = 40;
  const padding = 5;
  const rows = 6;
  const keysPerRow = [15, 15, 15, 15, 15, 11];

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#2A3B3C"/>`;

  let keyIndex = 0;
  let yOffset = 20;

  for (let row = 0; row < rows; row++) {
    const numKeys = keysPerRow[row];
    const rowWidth = numKeys * (keyWidth + padding);
    const xOffset = (width - rowWidth) / 2;

    for (let col = 0; col < numKeys; col++) {
      if (keyIndex < colors.length) {
        const [h, s, v] = colors[keyIndex];
        if (v > 0 || s > 0) {
          const [r, g, b] = hsvToRgb(h, s, v);
          const color = `rgb(${r},${g},${b})`;
          const x = xOffset + col * (keyWidth + padding);
          const y = yOffset + row * (keyHeight + padding);
          svg += `<rect x="${x}" y="${y}" width="${keyWidth}" height="${keyHeight}" fill="${color}" rx="3"/>`;
        }
        keyIndex++;
      }
    }
  }

  svg += '</svg>';

  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: presets, error: fetchError } = await supabase
      .from('presets')
      .select('id, rgb_config, thumbnail_url')
      .is('thumbnail_url', null);

    if (fetchError) throw fetchError;

    if (!presets || presets.length === 0) {
      return new Response(JSON.stringify({ message: 'No presets need thumbnails', updated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    for (const preset of presets) {
      const colors = preset.rgb_config?.colors;
      if (colors && Array.isArray(colors)) {
        const thumbnail = generateSimpleThumbnail(colors);
        const { error: updateError } = await supabase
          .from('presets')
          .update({ thumbnail_url: thumbnail })
          .eq('id', preset.id);

        if (!updateError) updated++;
      }
    }

    return new Response(JSON.stringify({ message: 'Thumbnails generated', updated, total: presets.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});