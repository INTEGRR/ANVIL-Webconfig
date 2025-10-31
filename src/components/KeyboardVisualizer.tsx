interface KeyPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface KeyboardVisualizerProps {
  keyColors: string[];
  onKeyClick: (index: number, event: React.MouseEvent) => void;
  selectedKeys?: Set<number>;
}

export default function KeyboardVisualizer({ keyColors, onKeyClick, selectedKeys = new Set() }: KeyboardVisualizerProps) {
  // Precise key positions mapped to the physical keyboard image
  // Measurements are in percentage of image dimensions
  const keyPositions: KeyPosition[] = [
    // Row 0: ESC, F1-F12, F13, PSCR, DEL (0-15)
    { x: 2.8, y: 6, width: 5.3, height: 16 },    // 0: ESC
    { x: 10.0, y: 6, width: 5.3, height: 16 },   // 1: F1
    { x: 16.2, y: 6, width: 5.3, height: 16 },   // 2: F2
    { x: 22.4, y: 6, width: 5.3, height: 16 },   // 3: F3
    { x: 28.6, y: 6, width: 5.3, height: 16 },   // 4: F4
    { x: 35.2, y: 6, width: 5.3, height: 16 },   // 5: F5
    { x: 41.4, y: 6, width: 5.3, height: 16 },   // 6: F6
    { x: 47.6, y: 6, width: 5.3, height: 16 },   // 7: F7
    { x: 53.8, y: 6, width: 5.3, height: 16 },   // 8: F8
    { x: 60.4, y: 6, width: 5.3, height: 16 },   // 9: F9
    { x: 66.6, y: 6, width: 5.3, height: 16 },   // 10: F10
    { x: 72.8, y: 6, width: 5.3, height: 16 },   // 11: F11
    { x: 79.0, y: 6, width: 5.3, height: 16 },   // 12: F12
    { x: 85.6, y: 6, width: 5.3, height: 16 },   // 13: F13
    { x: 91.8, y: 6, width: 5.3, height: 16 },   // 14: Print
    { x: 98.0, y: 6, width: 0, height: 0 },      // 15: DEL (outside visible area)

    // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30)
    { x: 2.8, y: 24, width: 5.3, height: 16 },   // 16: ^
    { x: 8.9, y: 24, width: 5.3, height: 16 },   // 17: 1
    { x: 15.0, y: 24, width: 5.3, height: 16 },  // 18: 2
    { x: 21.1, y: 24, width: 5.3, height: 16 },  // 19: 3
    { x: 27.2, y: 24, width: 5.3, height: 16 },  // 20: 4
    { x: 33.3, y: 24, width: 5.3, height: 16 },  // 21: 5
    { x: 39.4, y: 24, width: 5.3, height: 16 },  // 22: 6
    { x: 45.5, y: 24, width: 5.3, height: 16 },  // 23: 7
    { x: 51.6, y: 24, width: 5.3, height: 16 },  // 24: 8
    { x: 57.7, y: 24, width: 5.3, height: 16 },  // 25: 9
    { x: 63.8, y: 24, width: 5.3, height: 16 },  // 26: 0
    { x: 69.9, y: 24, width: 5.3, height: 16 },  // 27: ß
    { x: 76.0, y: 24, width: 5.3, height: 16 },  // 28: =
    { x: 82.1, y: 24, width: 9.5, height: 16 },  // 29: Backspace (wider)
    { x: 92.4, y: 24, width: 5.3, height: 16 },  // 30: PGUP

    // Row 2: TAB, Q-P, Ü, +, PGDN (31-44)
    { x: 2.8, y: 42, width: 7.0, height: 16 },   // 31: Tab (wider)
    { x: 10.6, y: 42, width: 5.3, height: 16 },  // 32: Q
    { x: 16.7, y: 42, width: 5.3, height: 16 },  // 33: W
    { x: 22.8, y: 42, width: 5.3, height: 16 },  // 34: E
    { x: 28.9, y: 42, width: 5.3, height: 16 },  // 35: R
    { x: 35.0, y: 42, width: 5.3, height: 16 },  // 36: T
    { x: 41.1, y: 42, width: 5.3, height: 16 },  // 37: Z
    { x: 47.2, y: 42, width: 5.3, height: 16 },  // 38: U
    { x: 53.3, y: 42, width: 5.3, height: 16 },  // 39: I
    { x: 59.4, y: 42, width: 5.3, height: 16 },  // 40: O
    { x: 65.5, y: 42, width: 5.3, height: 16 },  // 41: P
    { x: 71.6, y: 42, width: 5.3, height: 16 },  // 42: Ü
    { x: 77.7, y: 42, width: 5.3, height: 16 },  // 43: +
    { x: 92.4, y: 42, width: 5.3, height: 16 },  // 44: PGDN

    // Row 3: CAPS, A-L, Ö, Ä, #, ENT, HOME (45-59)
    { x: 2.8, y: 60, width: 8.5, height: 16 },   // 45: Caps Lock (wider)
    { x: 12.1, y: 60, width: 5.3, height: 16 },  // 46: A
    { x: 18.2, y: 60, width: 5.3, height: 16 },  // 47: S
    { x: 24.3, y: 60, width: 5.3, height: 16 },  // 48: D
    { x: 30.4, y: 60, width: 5.3, height: 16 },  // 49: F
    { x: 36.5, y: 60, width: 5.3, height: 16 },  // 50: G
    { x: 42.6, y: 60, width: 5.3, height: 16 },  // 51: H
    { x: 48.7, y: 60, width: 5.3, height: 16 },  // 52: J
    { x: 54.8, y: 60, width: 5.3, height: 16 },  // 53: K
    { x: 60.9, y: 60, width: 5.3, height: 16 },  // 54: L
    { x: 67.0, y: 60, width: 5.3, height: 16 },  // 55: Ö
    { x: 73.1, y: 60, width: 5.3, height: 16 },  // 56: Ä
    { x: 79.2, y: 60, width: 5.3, height: 16 },  // 57: #
    { x: 85.3, y: 60, width: 6.3, height: 16 },  // 58: Enter
    { x: 92.4, y: 60, width: 5.3, height: 16 },  // 59: HOME

    // Row 4: LSFT, NUBS, Z-M, COMM, DOT, SLSH, RSFT, UP, END (60-74)
    { x: 2.8, y: 78, width: 6.0, height: 16 },   // 60: Left Shift
    { x: 9.6, y: 78, width: 5.3, height: 16 },   // 61: < > |
    { x: 15.7, y: 78, width: 5.3, height: 16 },  // 62: Y
    { x: 21.8, y: 78, width: 5.3, height: 16 },  // 63: X
    { x: 27.9, y: 78, width: 5.3, height: 16 },  // 64: C
    { x: 34.0, y: 78, width: 5.3, height: 16 },  // 65: V
    { x: 40.1, y: 78, width: 5.3, height: 16 },  // 66: B
    { x: 46.2, y: 78, width: 5.3, height: 16 },  // 67: N
    { x: 52.3, y: 78, width: 5.3, height: 16 },  // 68: M
    { x: 58.4, y: 78, width: 5.3, height: 16 },  // 69: , (Comma)
    { x: 64.5, y: 78, width: 5.3, height: 16 },  // 70: . (Dot)
    { x: 70.6, y: 78, width: 5.3, height: 16 },  // 71: - (Minus/Slash)
    { x: 76.7, y: 78, width: 9.0, height: 16 },  // 72: Right Shift (wider)
    { x: 86.5, y: 78, width: 5.3, height: 16 },  // 73: Up
    { x: 92.4, y: 78, width: 5.3, height: 16 },  // 74: END

    // Row 5: LCTL, LGUI, LALT, SPC, RALT, FN, RCTL, LEFT, DOWN, RGHT (75-84)
    { x: 2.8, y: 96, width: 0, height: 0 },      // 75: Left Ctrl (below visible area)
    { x: 10.0, y: 96, width: 0, height: 0 },     // 76: Mod
    { x: 17.2, y: 96, width: 0, height: 0 },     // 77: Alt
    { x: 24.4, y: 96, width: 0, height: 0 },     // 78: Space
    { x: 56.2, y: 96, width: 0, height: 0 },     // 79: Alt Gr
    { x: 63.4, y: 96, width: 0, height: 0 },     // 80: Fn
    { x: 70.6, y: 96, width: 0, height: 0 },     // 81: Right Ctrl
    { x: 80.4, y: 96, width: 0, height: 0 },     // 82: Left
    { x: 86.5, y: 96, width: 0, height: 0 },     // 83: Down
    { x: 92.4, y: 96, width: 0, height: 0 },     // 84: Right
  ];

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Keyboard base image */}
      <img
        src="/keyboard-base.png"
        alt="Keyboard"
        className="w-full h-auto"
        onError={(e) => {
          // Fallback if image doesn't load
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* Color overlay for each key */}
      <div className="absolute inset-0">
        {keyPositions.map((pos, index) => {
          if (pos.height === 0 || pos.width === 0) return null; // Skip invisible keys

          const isSelected = selectedKeys.has(index);
          return (
            <button
              key={index}
              onClick={(e) => onKeyClick(index, e)}
              className={`absolute rounded-sm transition-all duration-200 cursor-pointer ${
                isSelected ? 'ring-4 ring-brand-beige' : 'hover:ring-2 hover:ring-brand-beige'
              }`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
                backgroundColor: keyColors[index] || 'transparent',
                opacity: isSelected ? 0.85 : 0.65,
                mixBlendMode: 'screen',
              }}
              title={`Key ${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
