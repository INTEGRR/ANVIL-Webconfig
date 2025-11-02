import { KEYBOARD_LAYOUT, KeyData } from '../data/keyboardLayout';
import { hsvToHex } from '../utils/colorUtils';

interface KeyboardLayoutProps {
  keyColors: number[][];
  selectedKeys: Set<number>;
  onKeyClick: (index: number, shiftKey: boolean, ctrlKey: boolean) => void;
}

export default function KeyboardLayout({ keyColors, selectedKeys, onKeyClick }: KeyboardLayoutProps) {
  const KEY_SIZE = 50;
  const PADDING = 10;

  const maxX = Math.max(...KEYBOARD_LAYOUT.map(k => k.x + k.width));
  const maxY = Math.max(...KEYBOARD_LAYOUT.map(k => k.y + k.height));

  const viewBoxWidth = maxX * KEY_SIZE + PADDING * 2;
  const viewBoxHeight = maxY * KEY_SIZE + PADDING * 2;

  const renderKey = (key: KeyData) => {
    const x = key.x * KEY_SIZE + PADDING;
    const y = key.y * KEY_SIZE + PADDING;
    const width = key.width * KEY_SIZE - 2;
    const height = key.height * KEY_SIZE - 2;

    const color = keyColors[key.index];
    const fillColor = color && color.length === 3 ? hsvToHex(color[0], color[1], color[2]) : '#666666';
    const isSelected = selectedKeys.has(key.index);

    return (
      <g
        key={key.index}
        onClick={(e) => onKeyClick(key.index, e.shiftKey, e.ctrlKey || e.metaKey)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          fill={fillColor}
          stroke={isSelected ? '#F5E6D3' : '#2A3B3C'}
          strokeWidth={isSelected ? 3 : 1}
          data-key-index={key.index}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={key.width > 2 ? 12 : 10}
          fontWeight="600"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {key.label}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full bg-brand-teal/60 rounded-xl border border-brand-sage/30 p-4 keyboard-layout-container">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto"
        style={{ maxHeight: '500px' }}
      >
        {KEYBOARD_LAYOUT.map(renderKey)}
      </svg>
    </div>
  );
}
