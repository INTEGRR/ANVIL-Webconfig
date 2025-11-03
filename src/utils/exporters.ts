import { DiagnosticStats, DiagnosticRecommendation } from './diagHeuristics';
import { EdgeEvent, ScanSummary } from '../lib/diagProtocol';

export interface ExportData {
  metadata: {
    timestamp: string;
    duration: number;
    deviceInfo: any;
  };
  events: EdgeEvent[];
  scanSummaries: ScanSummary[];
  statistics: DiagnosticStats;
  recommendations: DiagnosticRecommendation[];
}

export function exportJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJSON(data: ExportData, filename: string): void {
  const json = exportJSON(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function createHeatmapCanvas(
  stats: DiagnosticStats,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  const maxChatter = Math.max(...stats.chatterRate, 1);
  const keyWidth = width / 15;
  const keyHeight = height / 6;

  for (let key = 0; key < 85; key++) {
    const row = Math.floor(key / 15);
    const col = key % 15;
    const chatter = stats.chatterRate[key];
    const intensity = Math.min(chatter / maxChatter, 1);

    const x = col * keyWidth;
    const y = row * keyHeight;

    if (intensity > 0.01) {
      ctx.fillStyle = `rgb(${Math.floor(255 * intensity)}, ${Math.floor(128 * (1 - intensity))}, 0)`;
    } else {
      ctx.fillStyle = '#333';
    }

    ctx.fillRect(x + 2, y + 2, keyWidth - 4, keyHeight - 4);

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chatter.toFixed(1) + '%', x + keyWidth / 2, y + keyHeight / 2);
  }

  return canvas;
}

export function downloadPNG(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob(blob => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

export function createTimelineGIF(
  events: EdgeEvent[],
  duration: number,
  width: number,
  height: number
): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const fps = 10;
  const frameCount = Math.min(fps * 10, 100);
  const keyWidth = width / 15;
  const keyHeight = height / 6;

  const maxTime = events.length > 0 ? events[events.length - 1].timestamp_us : 1000000;
  const timePerFrame = maxTime / frameCount;

  for (let frame = 0; frame < frameCount; frame++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const currentTime = frame * timePerFrame;
    const keyStates: boolean[] = Array(85).fill(false);

    for (const event of events) {
      if (event.timestamp_us > currentTime) break;
      if (event.phase === 2) {
        keyStates[event.key] = event.kind === 1;
      }
    }

    for (let key = 0; key < 85; key++) {
      const row = Math.floor(key / 15);
      const col = key % 15;
      const x = col * keyWidth;
      const y = row * keyHeight;

      ctx.fillStyle = keyStates[key] ? '#00ff00' : '#333';
      ctx.fillRect(x + 2, y + 2, keyWidth - 4, keyHeight - 4);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`${(currentTime / 1000).toFixed(1)}ms`, 10, height - 10);

    frames.push(canvas);
  }

  return frames;
}

export function downloadGIF(frames: HTMLCanvasElement[], filename: string): void {
  const canvas = frames[0];
  canvas.toBlob(blob => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}
