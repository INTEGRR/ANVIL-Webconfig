import React from 'react';

interface KeyboardVisualizer3DProps {
  keyColors: string[];
  onKeyClick: (index: number, event: React.MouseEvent) => void;
  selectedKeys?: Set<number>;
}

interface KeyCapProps {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isSelected: boolean;
  onClick: (index: number, event: React.MouseEvent) => void;
  isAccent?: boolean;
  label: string;
  isISOEnter?: boolean;
}

const KeyCap: React.FC<KeyCapProps> = ({
  index,
  x,
  y,
  width,
  height,
  color,
  isSelected,
  onClick,
  isAccent = false,
  label,
  isISOEnter = false
}) => {
  const bgColor = isAccent ? '#E8C4B8' : '#363434';
  const shadowColor = isAccent ? '#BA9D93' : '#2B2A2A';
  const depth = 6;

  if (isISOEnter) {
    // ISO Enter (inverted L-shape)
    return (
      <div
        onClick={(e) => onClick(index, e)}
        className={`absolute cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-4 ring-brand-beige z-20' : 'hover:ring-2 hover:ring-brand-sage z-10'
        }`}
        style={{
          transform: `translate(${x}px, ${y}px)`,
          width: `${width}px`,
          height: `${height * 2 + 4}px`,
        }}
      >
        {/* Top part of Enter */}
        <div
          className="absolute rounded"
          style={{
            top: 0,
            right: 0,
            width: `${width}px`,
            height: `${height}px`,
            background: shadowColor,
            transform: 'perspective(300px) rotateX(5deg)',
          }}
        >
          <div
            className="absolute inset-0 rounded flex items-center justify-center text-white font-medium text-xs"
            style={{
              background: bgColor,
              transform: `translate(2px, 2px)`,
              width: `${width - 4}px`,
              height: `${height - 4}px`,
              boxShadow: `0 ${depth}px 0 ${shadowColor}`,
            }}
          >
            <div
              className="absolute inset-0 rounded"
              style={{
                background: color,
                opacity: isSelected ? 0.85 : 0.7,
                mixBlendMode: 'screen',
              }}
            />
            <span className="relative z-10 drop-shadow-lg">{label}</span>
          </div>
        </div>

        {/* Bottom part of Enter */}
        <div
          className="absolute rounded"
          style={{
            top: `${height + 4}px`,
            left: 0,
            width: `${width * 1.5}px`,
            height: `${height}px`,
            background: shadowColor,
            transform: 'perspective(300px) rotateX(5deg)',
          }}
        >
          <div
            className="absolute inset-0 rounded"
            style={{
              background: bgColor,
              transform: `translate(2px, 2px)`,
              width: `${width * 1.5 - 4}px`,
              height: `${height - 4}px`,
              boxShadow: `0 ${depth}px 0 ${shadowColor}`,
            }}
          >
            <div
              className="absolute inset-0 rounded"
              style={{
                background: color,
                opacity: isSelected ? 0.85 : 0.7,
                mixBlendMode: 'screen',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => onClick(index, e)}
      className={`absolute cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-4 ring-brand-beige z-20' : 'hover:ring-2 hover:ring-brand-sage z-10'
      }`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div
        className="relative w-full h-full rounded"
        style={{
          background: shadowColor,
          transform: 'perspective(300px) rotateX(5deg)',
        }}
      >
        <div
          className="absolute inset-0 rounded flex items-center justify-center text-white font-medium text-xs"
          style={{
            background: bgColor,
            transform: `translate(2px, 2px)`,
            width: `${width - 4}px`,
            height: `${height - 4}px`,
            boxShadow: `0 ${depth}px 0 ${shadowColor}`,
          }}
        >
          <div
            className="absolute inset-0 rounded"
            style={{
              background: color,
              opacity: isSelected ? 0.85 : 0.7,
              mixBlendMode: 'screen',
            }}
          />
          <span className="relative z-10 drop-shadow-lg">{label}</span>
        </div>
      </div>
    </div>
  );
};

export default function KeyboardVisualizer3D({
  keyColors,
  onKeyClick,
  selectedKeys = new Set()
}: KeyboardVisualizer3DProps) {
  const gap = 4;
  const keySize = 54;

  const keyLayout = [
    // Row 0: Function row (0-15)
    { index: 0, x: 0, y: 0, width: keySize, height: keySize, accent: true, label: 'ESC' },
    { index: 1, x: keySize + gap, y: 0, width: keySize, height: keySize, label: 'F1' },
    { index: 2, x: (keySize + gap) * 2, y: 0, width: keySize, height: keySize, label: 'F2' },
    { index: 3, x: (keySize + gap) * 3, y: 0, width: keySize, height: keySize, label: 'F3' },
    { index: 4, x: (keySize + gap) * 4, y: 0, width: keySize, height: keySize, label: 'F4' },
    { index: 5, x: (keySize + gap) * 5, y: 0, width: keySize, height: keySize, label: 'F5' },
    { index: 6, x: (keySize + gap) * 6, y: 0, width: keySize, height: keySize, label: 'F6' },
    { index: 7, x: (keySize + gap) * 7, y: 0, width: keySize, height: keySize, label: 'F7' },
    { index: 8, x: (keySize + gap) * 8, y: 0, width: keySize, height: keySize, label: 'F8' },
    { index: 9, x: (keySize + gap) * 9, y: 0, width: keySize, height: keySize, label: 'F9' },
    { index: 10, x: (keySize + gap) * 10, y: 0, width: keySize, height: keySize, label: 'F10' },
    { index: 11, x: (keySize + gap) * 11, y: 0, width: keySize, height: keySize, label: 'F11' },
    { index: 12, x: (keySize + gap) * 12, y: 0, width: keySize, height: keySize, label: 'F12' },
    { index: 13, x: (keySize + gap) * 13, y: 0, width: keySize, height: keySize, label: 'F13' },
    { index: 14, x: (keySize + gap) * 14, y: 0, width: keySize, height: keySize, label: 'PRSC' },
    { index: 15, x: (keySize + gap) * 15, y: 0, width: keySize, height: keySize, label: 'DEL' },

    // Row 1: Number row (16-30)
    { index: 16, x: 0, y: (keySize + gap), width: keySize, height: keySize, label: '^' },
    { index: 17, x: keySize + gap, y: (keySize + gap), width: keySize, height: keySize, label: '1' },
    { index: 18, x: (keySize + gap) * 2, y: (keySize + gap), width: keySize, height: keySize, label: '2' },
    { index: 19, x: (keySize + gap) * 3, y: (keySize + gap), width: keySize, height: keySize, label: '3' },
    { index: 20, x: (keySize + gap) * 4, y: (keySize + gap), width: keySize, height: keySize, label: '4' },
    { index: 21, x: (keySize + gap) * 5, y: (keySize + gap), width: keySize, height: keySize, label: '5' },
    { index: 22, x: (keySize + gap) * 6, y: (keySize + gap), width: keySize, height: keySize, label: '6' },
    { index: 23, x: (keySize + gap) * 7, y: (keySize + gap), width: keySize, height: keySize, label: '7' },
    { index: 24, x: (keySize + gap) * 8, y: (keySize + gap), width: keySize, height: keySize, label: '8' },
    { index: 25, x: (keySize + gap) * 9, y: (keySize + gap), width: keySize, height: keySize, label: '9' },
    { index: 26, x: (keySize + gap) * 10, y: (keySize + gap), width: keySize, height: keySize, label: '0' },
    { index: 27, x: (keySize + gap) * 11, y: (keySize + gap), width: keySize, height: keySize, label: 'ß' },
    { index: 28, x: (keySize + gap) * 12, y: (keySize + gap), width: keySize, height: keySize, label: '´' },
    { index: 29, x: (keySize + gap) * 13, y: (keySize + gap), width: keySize * 2 + gap, height: keySize, label: '⌫' },
    { index: 30, x: (keySize + gap) * 15, y: (keySize + gap), width: keySize, height: keySize, label: 'PG↑' },

    // Row 2: Tab row (31-45)
    { index: 31, x: 0, y: (keySize + gap) * 2, width: keySize * 1.5 + gap * 0.5, height: keySize, label: 'TAB' },
    { index: 32, x: keySize * 1.5 + gap * 1.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'Q' },
    { index: 33, x: keySize * 2.5 + gap * 2.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'W' },
    { index: 34, x: keySize * 3.5 + gap * 3.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'E' },
    { index: 35, x: keySize * 4.5 + gap * 4.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'R' },
    { index: 36, x: keySize * 5.5 + gap * 5.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'T' },
    { index: 37, x: keySize * 6.5 + gap * 6.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'Z' },
    { index: 38, x: keySize * 7.5 + gap * 7.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'U' },
    { index: 39, x: keySize * 8.5 + gap * 8.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'I' },
    { index: 40, x: keySize * 9.5 + gap * 9.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'O' },
    { index: 41, x: keySize * 10.5 + gap * 10.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'P' },
    { index: 42, x: keySize * 11.5 + gap * 11.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'Ü' },
    { index: 43, x: keySize * 12.5 + gap * 12.5, y: (keySize + gap) * 2, width: keySize, height: keySize, label: '+' },
    { index: 44, x: keySize * 14 + gap * 13.5, y: (keySize + gap) * 2, width: keySize, height: keySize, accent: true, label: '↵', isISOEnter: true },
    { index: 45, x: (keySize + gap) * 15, y: (keySize + gap) * 2, width: keySize, height: keySize, label: 'PG↓' },

    // Row 3: Caps Lock row (46-59)
    { index: 46, x: 0, y: (keySize + gap) * 3, width: keySize * 1.75 + gap * 0.75, height: keySize, label: 'CAPS' },
    { index: 47, x: keySize * 1.75 + gap * 1.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'A' },
    { index: 48, x: keySize * 2.75 + gap * 2.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'S' },
    { index: 49, x: keySize * 3.75 + gap * 3.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'D' },
    { index: 50, x: keySize * 4.75 + gap * 4.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'F' },
    { index: 51, x: keySize * 5.75 + gap * 5.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'G' },
    { index: 52, x: keySize * 6.75 + gap * 6.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'H' },
    { index: 53, x: keySize * 7.75 + gap * 7.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'J' },
    { index: 54, x: keySize * 8.75 + gap * 8.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'K' },
    { index: 55, x: keySize * 9.75 + gap * 9.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'L' },
    { index: 56, x: keySize * 10.75 + gap * 10.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'Ö' },
    { index: 57, x: keySize * 11.75 + gap * 11.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'Ä' },
    { index: 58, x: keySize * 12.75 + gap * 12.75, y: (keySize + gap) * 3, width: keySize, height: keySize, label: '#' },
    { index: 59, x: (keySize + gap) * 15, y: (keySize + gap) * 3, width: keySize, height: keySize, label: 'HOME' },

    // Row 4: Shift row (60-74)
    { index: 60, x: 0, y: (keySize + gap) * 4, width: keySize * 1.25 + gap * 0.25, height: keySize, label: '⇧' },
    { index: 61, x: keySize * 1.25 + gap * 1.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: '<' },
    { index: 62, x: keySize * 2.25 + gap * 2.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'Y' },
    { index: 63, x: keySize * 3.25 + gap * 3.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'X' },
    { index: 64, x: keySize * 4.25 + gap * 4.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'C' },
    { index: 65, x: keySize * 5.25 + gap * 5.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'V' },
    { index: 66, x: keySize * 6.25 + gap * 6.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'B' },
    { index: 67, x: keySize * 7.25 + gap * 7.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'N' },
    { index: 68, x: keySize * 8.25 + gap * 8.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'M' },
    { index: 69, x: keySize * 9.25 + gap * 9.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: ',' },
    { index: 70, x: keySize * 10.25 + gap * 10.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: '.' },
    { index: 71, x: keySize * 11.25 + gap * 11.25, y: (keySize + gap) * 4, width: keySize, height: keySize, label: '-' },
    { index: 72, x: keySize * 12.25 + gap * 12.25, y: (keySize + gap) * 4, width: keySize * 1.75 + gap * 0.75, height: keySize, label: '⇧' },
    { index: 73, x: keySize * 14 + gap * 14, y: (keySize + gap) * 4, width: keySize, height: keySize, label: '↑' },
    { index: 74, x: (keySize + gap) * 15, y: (keySize + gap) * 4, width: keySize, height: keySize, label: 'END' },

    // Row 5: Bottom row (75-84)
    { index: 75, x: 0, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'CTRL' },
    { index: 76, x: keySize * 1.25 + gap * 1.25, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'WIN' },
    { index: 77, x: keySize * 2.5 + gap * 2.5, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'ALT' },
    { index: 78, x: keySize * 3.75 + gap * 3.75, y: (keySize + gap) * 5, width: keySize * 6.25 + gap * 5.25, height: keySize, label: '' },
    { index: 79, x: keySize * 10 + gap * 10, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'ALT' },
    { index: 80, x: keySize * 11.25 + gap * 11.25, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'FN' },
    { index: 81, x: keySize * 12.5 + gap * 12.5, y: (keySize + gap) * 5, width: keySize * 1.25 + gap * 0.25, height: keySize, label: 'CTRL' },
    { index: 82, x: keySize * 13.75 + gap * 13.75, y: (keySize + gap) * 5, width: keySize, height: keySize, label: '←' },
    { index: 83, x: keySize * 14.75 + gap * 14.75, y: (keySize + gap) * 5, width: keySize, height: keySize, label: '↓' },
    { index: 84, x: (keySize + gap) * 15.75, y: (keySize + gap) * 5, width: keySize, height: keySize, label: '→' },
  ];

  const totalWidth = (keySize + gap) * 16 + 40;
  const totalHeight = (keySize + gap) * 6 + 40;

  return (
    <div className="inline-block p-8">
      <div className="relative" style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}>
        {/* Outer beige border */}
        <div
          className="absolute rounded-lg"
          style={{
            width: `${totalWidth}px`,
            height: `${totalHeight}px`,
            background: '#E8C4B8',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          }}
        />

        {/* Dark keyboard base */}
        <div
          className="absolute rounded-lg"
          style={{
            transform: 'translate(10px, 10px)',
            width: `${totalWidth - 20}px`,
            height: `${totalHeight - 20}px`,
            background: 'linear-gradient(200deg, #231d1c 40%, #3a312e, #2e2725 80%)',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Keys container */}
        <div
          className="absolute"
          style={{
            transform: 'translate(20px, 20px)',
            width: `${totalWidth - 40}px`,
            height: `${totalHeight - 40}px`,
          }}
        >
          {keyLayout.map((key) => (
            <KeyCap
              key={key.index}
              index={key.index}
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              color={keyColors[key.index] || 'transparent'}
              isSelected={selectedKeys.has(key.index)}
              onClick={onKeyClick}
              isAccent={key.accent}
              label={key.label}
              isISOEnter={key.isISOEnter}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
