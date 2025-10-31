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
  isAccent = false
}) => {
  const bgColor = isAccent ? '#E8C4B8' : '#363434';
  const shadowColor = isAccent ? '#BA9D93' : '#2B2A2A';

  return (
    <div
      onClick={(e) => onClick(index, e)}
      className={`absolute cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-4 ring-brand-beige' : 'hover:ring-2 hover:ring-brand-sage'
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
          transform: 'perspective(100px) translateZ(0px)',
        }}
      >
        <div
          className="absolute inset-0 rounded"
          style={{
            background: bgColor,
            transform: 'translate(1px, 1px)',
            width: `${width - 2}px`,
            height: `${height - 2}px`,
          }}
        >
          <div
            className="w-full h-full rounded"
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
};

export default function KeyboardVisualizer3D({
  keyColors,
  onKeyClick,
  selectedKeys = new Set()
}: KeyboardVisualizer3DProps) {
  const keyLayout = [
    // Row 0: Function row (0-16)
    { index: 0, x: 0, y: 0, width: 52, height: 54, accent: true },
    { index: 1, x: 54, y: 0, width: 52, height: 54 },
    { index: 2, x: 108, y: 0, width: 52, height: 54 },
    { index: 3, x: 162, y: 0, width: 52, height: 54 },
    { index: 4, x: 216, y: 0, width: 52, height: 54 },
    { index: 5, x: 270, y: 0, width: 52, height: 54 },
    { index: 6, x: 324, y: 0, width: 52, height: 54 },
    { index: 7, x: 378, y: 0, width: 52, height: 54 },
    { index: 8, x: 432, y: 0, width: 52, height: 54 },
    { index: 9, x: 486, y: 0, width: 52, height: 54 },
    { index: 10, x: 540, y: 0, width: 52, height: 54 },
    { index: 11, x: 594, y: 0, width: 52, height: 54 },
    { index: 12, x: 648, y: 0, width: 52, height: 54 },
    { index: 13, x: 702, y: 0, width: 52, height: 54 },
    { index: 14, x: 756, y: 0, width: 52, height: 54 },
    { index: 15, x: 810, y: 0, width: 52, height: 54 },

    // Row 1: Number row (16-30)
    { index: 16, x: 0, y: 56, width: 52, height: 54 },
    { index: 17, x: 54, y: 56, width: 52, height: 54 },
    { index: 18, x: 108, y: 56, width: 52, height: 54 },
    { index: 19, x: 162, y: 56, width: 52, height: 54 },
    { index: 20, x: 216, y: 56, width: 52, height: 54 },
    { index: 21, x: 270, y: 56, width: 52, height: 54 },
    { index: 22, x: 324, y: 56, width: 52, height: 54 },
    { index: 23, x: 378, y: 56, width: 52, height: 54 },
    { index: 24, x: 432, y: 56, width: 52, height: 54 },
    { index: 25, x: 486, y: 56, width: 52, height: 54 },
    { index: 26, x: 540, y: 56, width: 52, height: 54 },
    { index: 27, x: 594, y: 56, width: 52, height: 54 },
    { index: 28, x: 648, y: 56, width: 52, height: 54 },
    { index: 29, x: 702, y: 56, width: 106, height: 54 },
    { index: 30, x: 810, y: 56, width: 52, height: 54 },

    // Row 2: Tab row (31-45)
    { index: 31, x: 0, y: 112, width: 79, height: 54 },
    { index: 32, x: 81, y: 112, width: 52, height: 54 },
    { index: 33, x: 135, y: 112, width: 52, height: 54 },
    { index: 34, x: 189, y: 112, width: 52, height: 54 },
    { index: 35, x: 243, y: 112, width: 52, height: 54 },
    { index: 36, x: 297, y: 112, width: 52, height: 54 },
    { index: 37, x: 351, y: 112, width: 52, height: 54 },
    { index: 38, x: 405, y: 112, width: 52, height: 54 },
    { index: 39, x: 459, y: 112, width: 52, height: 54 },
    { index: 40, x: 513, y: 112, width: 52, height: 54 },
    { index: 41, x: 567, y: 112, width: 52, height: 54 },
    { index: 42, x: 621, y: 112, width: 52, height: 54 },
    { index: 43, x: 675, y: 112, width: 52, height: 54 },
    { index: 44, x: 729, y: 112, width: 79, height: 54, accent: true },
    { index: 45, x: 810, y: 112, width: 52, height: 54 },

    // Row 3: Caps Lock row (46-59)
    { index: 46, x: 0, y: 168, width: 92.5, height: 54 },
    { index: 47, x: 94.5, y: 168, width: 52, height: 54 },
    { index: 48, x: 148.5, y: 168, width: 52, height: 54 },
    { index: 49, x: 202.5, y: 168, width: 52, height: 54 },
    { index: 50, x: 256.5, y: 168, width: 52, height: 54 },
    { index: 51, x: 310.5, y: 168, width: 52, height: 54 },
    { index: 52, x: 364.5, y: 168, width: 52, height: 54 },
    { index: 53, x: 418.5, y: 168, width: 52, height: 54 },
    { index: 54, x: 472.5, y: 168, width: 52, height: 54 },
    { index: 55, x: 526.5, y: 168, width: 52, height: 54 },
    { index: 56, x: 580.5, y: 168, width: 52, height: 54 },
    { index: 57, x: 634.5, y: 168, width: 52, height: 54 },
    { index: 58, x: 688.5, y: 168, width: 52, height: 54 },
    { index: 59, x: 810, y: 168, width: 52, height: 54 },

    // Row 4: Shift row (60-73)
    { index: 60, x: 0, y: 224, width: 65.5, height: 54 },
    { index: 61, x: 67.5, y: 224, width: 52, height: 54 },
    { index: 62, x: 121.5, y: 224, width: 52, height: 54 },
    { index: 63, x: 175.5, y: 224, width: 52, height: 54 },
    { index: 64, x: 229.5, y: 224, width: 52, height: 54 },
    { index: 65, x: 283.5, y: 224, width: 52, height: 54 },
    { index: 66, x: 337.5, y: 224, width: 52, height: 54 },
    { index: 67, x: 391.5, y: 224, width: 52, height: 54 },
    { index: 68, x: 445.5, y: 224, width: 52, height: 54 },
    { index: 69, x: 499.5, y: 224, width: 52, height: 54 },
    { index: 70, x: 553.5, y: 224, width: 52, height: 54 },
    { index: 71, x: 607.5, y: 224, width: 52, height: 54 },
    { index: 72, x: 661.5, y: 224, width: 92.5, height: 54 },
    { index: 73, x: 756, y: 224, width: 52, height: 54 },
    { index: 74, x: 810, y: 224, width: 52, height: 54 },

    // Row 5: Bottom row (75-85)
    { index: 75, x: 0, y: 280, width: 65.5, height: 54 },
    { index: 76, x: 67.5, y: 280, width: 65.5, height: 54 },
    { index: 77, x: 135, y: 280, width: 65.5, height: 54 },
    { index: 78, x: 202.5, y: 280, width: 335.5, height: 54 },
    { index: 79, x: 540, y: 280, width: 52, height: 54 },
    { index: 80, x: 594, y: 280, width: 52, height: 54 },
    { index: 81, x: 648, y: 280, width: 52, height: 54 },
    { index: 82, x: 702, y: 280, width: 52, height: 54 },
    { index: 83, x: 756, y: 280, width: 52, height: 54 },
    { index: 84, x: 810, y: 280, width: 52, height: 54 },
  ];

  return (
    <div className="inline-block p-8">
      <div className="relative" style={{ width: '892px', height: '364px' }}>
        {/* Outer beige border */}
        <div
          className="absolute rounded-lg"
          style={{
            width: '892px',
            height: '364px',
            background: '#E8C4B8',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          }}
        />

        {/* Dark keyboard base */}
        <div
          className="absolute rounded-lg"
          style={{
            transform: 'translate(10px, 10px)',
            width: '872px',
            height: '344px',
            background: 'linear-gradient(200deg, #231d1c 40%, #3a312e, #2e2725 80%)',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        />

        {/* Keys container */}
        <div
          className="absolute"
          style={{
            transform: 'translate(20px, 20px)',
            width: '862px',
            height: '334px',
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
