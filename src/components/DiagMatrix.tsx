import { useEffect, useRef } from 'react';
import { MATRIX_CONFIG } from '../lib/diagProtocol';

interface DiagMatrixProps {
  preDebounceState: boolean[][];
  postDebounceState: boolean[][];
  width?: number;
  height?: number;
}

export default function DiagMatrix({
  preDebounceState,
  postDebounceState,
  width = 900,
  height = 360
}: DiagMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const keyWidth = width / MATRIX_CONFIG.COLS;
    const keyHeight = (height / 2) / MATRIX_CONFIG.ROWS;

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText('Pre-Debounce', 10, 15);
    ctx.fillText('Post-Debounce', 10, height / 2 + 15);

    for (let row = 0; row < MATRIX_CONFIG.ROWS; row++) {
      for (let col = 0; col < MATRIX_CONFIG.COLS; col++) {
        const x = col * keyWidth;
        const yPre = row * keyHeight + 25;
        const yPost = row * keyHeight + height / 2 + 25;

        const preActive = preDebounceState[row]?.[col] || false;
        const postActive = postDebounceState[row]?.[col] || false;

        ctx.fillStyle = preActive ? '#ffff00' : '#333';
        ctx.fillRect(x + 2, yPre + 2, keyWidth - 4, keyHeight - 4);

        ctx.fillStyle = postActive ? '#00ff00' : '#333';
        ctx.fillRect(x + 2, yPost + 2, keyWidth - 4, keyHeight - 4);

        ctx.strokeStyle = '#666';
        ctx.strokeRect(x + 2, yPre + 2, keyWidth - 4, keyHeight - 4);
        ctx.strokeRect(x + 2, yPost + 2, keyWidth - 4, keyHeight - 4);
      }
    }
  }, [preDebounceState, postDebounceState, width, height]);

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full"
      />
    </div>
  );
}
