import { useEffect, useRef } from 'react';
import { EdgeEvent } from '../lib/diagProtocol';

interface DiagTimelineProps {
  events: EdgeEvent[];
  selectedKey?: number;
  width?: number;
  height?: number;
  timeWindow?: number;
}

export default function DiagTimeline({
  events,
  selectedKey,
  width = 1200,
  height = 400,
  timeWindow = 10000000
}: DiagTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (events.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No events yet...', width / 2, height / 2);
      return;
    }

    const latestTime = events[events.length - 1].timestamp_us;
    const startTime = Math.max(0, latestTime - timeWindow);

    const filteredEvents = events.filter(e =>
      e.timestamp_us >= startTime &&
      (selectedKey === undefined || e.key === selectedKey)
    );

    if (filteredEvents.length === 0) return;

    const keySet = new Set(filteredEvents.map(e => e.key));
    const keys = Array.from(keySet).sort((a, b) => a - b);
    const rowHeight = height / Math.max(keys.length, 1);

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    keys.forEach((key, index) => {
      const y = index * rowHeight + rowHeight / 2;
      ctx.fillText(`Key ${key}`, 5, y);
    });

    const timeScale = (width - 80) / timeWindow;

    keys.forEach((key, index) => {
      const y = index * rowHeight;
      const keyEvents = filteredEvents.filter(e => e.key === key);

      keyEvents.forEach(event => {
        const x = 80 + (event.timestamp_us - startTime) * timeScale;
        const barHeight = rowHeight * 0.3;

        if (event.phase === 1) {
          ctx.fillStyle = event.kind === 1 ? 'rgba(255, 255, 0, 0.5)' : 'rgba(128, 128, 0, 0.5)';
          ctx.fillRect(x - 1, y + rowHeight * 0.1, 2, barHeight);
        } else {
          ctx.fillStyle = event.kind === 1 ? '#00ff00' : '#ff0000';
          ctx.fillRect(x - 1, y + rowHeight * 0.5, 2, barHeight);
        }
      });

      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    const divisions = 10;
    for (let i = 0; i <= divisions; i++) {
      const x = 80 + (i / divisions) * (width - 80);
      const time = startTime + (i / divisions) * timeWindow;
      ctx.fillText(`${(time / 1000).toFixed(0)}ms`, x - 20, height - 5);

      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
    }
  }, [events, selectedKey, width, height, timeWindow]);

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="flex items-center gap-4 mb-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 opacity-50"></div>
          <span className="text-gray-300">Pre-Debounce</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500"></div>
          <span className="text-gray-300">Post-Debounce Down</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span className="text-gray-300">Post-Debounce Up</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full"
      />
    </div>
  );
}
