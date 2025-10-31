import { useState } from 'react';

interface KeyProps {
  index: number;
  label: string;
  width?: number;
  color: string;
  onClick: (index: number, event: React.MouseEvent) => void;
  isSelected?: boolean;
}

function Key({ index, label, width = 1, color, onClick, isSelected = false }: KeyProps) {
  return (
    <button
      onClick={(e) => onClick(index, e)}
      className={`h-12 rounded border-2 transition-all font-mono text-xs flex items-center justify-center ${
        isSelected ? 'border-brand-beige border-4 ring-2 ring-brand-beige/50' : 'border-brand-sage/40 hover:border-brand-beige'
      }`}
      style={{
        width: `${width * 3}rem`,
        backgroundColor: color,
      }}
      title={`Key ${index}: ${label}`}
    >
      <span className="text-white drop-shadow-lg">{label}</span>
    </button>
  );
}

interface KeyboardLayoutProps {
  onKeyClick: (index: number, event: React.MouseEvent) => void;
  keyColors: string[];
  selectedKeys?: Set<number>;
}

export default function KeyboardLayout({ onKeyClick, keyColors, selectedKeys = new Set() }: KeyboardLayoutProps) {
  const isoLayout = [
    // Row 0: ESC, F1-F12, F13, PSCR, DEL (0-15) - 16 keys
    [
      { index: 0, label: 'ESC', width: 1 },
      { index: 1, label: 'F1', width: 1 },
      { index: 2, label: 'F2', width: 1 },
      { index: 3, label: 'F3', width: 1 },
      { index: 4, label: 'F4', width: 1 },
      { index: 5, label: 'F5', width: 1 },
      { index: 6, label: 'F6', width: 1 },
      { index: 7, label: 'F7', width: 1 },
      { index: 8, label: 'F8', width: 1 },
      { index: 9, label: 'F9', width: 1 },
      { index: 10, label: 'F10', width: 1 },
      { index: 11, label: 'F11', width: 1 },
      { index: 12, label: 'F12', width: 1 },
      { index: 13, label: 'F13', width: 1 },
      { index: 14, label: 'PRSC', width: 1 },
      { index: 15, label: 'DEL', width: 1 },
    ],
    // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30) - 15 keys
    [
      { index: 16, label: '^', width: 1 },
      { index: 17, label: '1', width: 1 },
      { index: 18, label: '2', width: 1 },
      { index: 19, label: '3', width: 1 },
      { index: 20, label: '4', width: 1 },
      { index: 21, label: '5', width: 1 },
      { index: 22, label: '6', width: 1 },
      { index: 23, label: '7', width: 1 },
      { index: 24, label: '8', width: 1 },
      { index: 25, label: '9', width: 1 },
      { index: 26, label: '0', width: 1 },
      { index: 27, label: 'ß', width: 1 },
      { index: 28, label: '=', width: 1 },
      { index: 29, label: '⌫', width: 2 },
      { index: 30, label: 'PGUP', width: 1 },
    ],
    // Row 2: TAB, Q-P, LBRC, RBRC, PGDN (31-44) - 14 keys
    [
      { index: 31, label: 'TAB', width: 1.5 },
      { index: 32, label: 'Q', width: 1 },
      { index: 33, label: 'W', width: 1 },
      { index: 34, label: 'E', width: 1 },
      { index: 35, label: 'R', width: 1 },
      { index: 36, label: 'T', width: 1 },
      { index: 37, label: 'Y', width: 1 },
      { index: 38, label: 'U', width: 1 },
      { index: 39, label: 'I', width: 1 },
      { index: 40, label: 'O', width: 1 },
      { index: 41, label: 'P', width: 1 },
      { index: 42, label: '[', width: 1 },
      { index: 43, label: ']', width: 1 },
      { index: 44, label: 'PGDN', width: 1 },
    ],
    // Row 3: CAPS, A-L, SCLN, QUOT, NUHS, ENT, HOME (45-59) - 15 keys
    [
      { index: 45, label: 'CAPS', width: 1.75 },
      { index: 46, label: 'A', width: 1 },
      { index: 47, label: 'S', width: 1 },
      { index: 48, label: 'D', width: 1 },
      { index: 49, label: 'F', width: 1 },
      { index: 50, label: 'G', width: 1 },
      { index: 51, label: 'H', width: 1 },
      { index: 52, label: 'J', width: 1 },
      { index: 53, label: 'K', width: 1 },
      { index: 54, label: 'L', width: 1 },
      { index: 55, label: ';', width: 1 },
      { index: 56, label: "'", width: 1 },
      { index: 57, label: '#', width: 1 },
      { index: 58, label: '↵', width: 1.25 },
      { index: 59, label: 'HOME', width: 1 },
    ],
    // Row 4: LSFT, NUBS, Z-M, COMM, DOT, SLSH, RSFT, UP, END (60-74) - 15 keys
    [
      { index: 60, label: '⇧', width: 1.25 },
      { index: 61, label: '<', width: 1 },
      { index: 62, label: 'Z', width: 1 },
      { index: 63, label: 'X', width: 1 },
      { index: 64, label: 'C', width: 1 },
      { index: 65, label: 'V', width: 1 },
      { index: 66, label: 'B', width: 1 },
      { index: 67, label: 'N', width: 1 },
      { index: 68, label: 'M', width: 1 },
      { index: 69, label: ',', width: 1 },
      { index: 70, label: '.', width: 1 },
      { index: 71, label: '/', width: 1 },
      { index: 72, label: '⇧', width: 2.75 },
      { index: 73, label: '↑', width: 1 },
      { index: 74, label: 'END', width: 1 },
    ],
    // Row 5: LCTL, LGUI, LALT, SPC, RALT, FN, RCTL, LEFT, DOWN, RGHT (75-84) - 10 keys
    [
      { index: 75, label: 'CTRL', width: 1.25 },
      { index: 76, label: 'WIN', width: 1.25 },
      { index: 77, label: 'ALT', width: 1.25 },
      { index: 78, label: 'SPACE', width: 6.25 },
      { index: 79, label: 'ALT', width: 1.25 },
      { index: 80, label: 'FN', width: 1.25 },
      { index: 81, label: 'CTRL', width: 1.25 },
      { index: 82, label: '←', width: 1 },
      { index: 83, label: '↓', width: 1 },
      { index: 84, label: '→', width: 1 },
    ],
  ];

  return (
    <div className="inline-block bg-brand-teal/60 p-6 rounded-2xl border border-brand-sage/30">
      <div className="space-y-2">
        {isoLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((key) => (
              <Key
                key={key.index}
                index={key.index}
                label={key.label}
                width={key.width}
                color={keyColors[key.index] || '#25384A'}
                onClick={onKeyClick}
                isSelected={selectedKeys.has(key.index)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
