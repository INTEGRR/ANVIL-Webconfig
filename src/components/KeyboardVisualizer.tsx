interface KeyPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface KeyboardVisualizerProps {
  keyColors: string[];
  onKeyClick: (index: number) => void;
}

export default function KeyboardVisualizer({ keyColors, onKeyClick }: KeyboardVisualizerProps) {
  // Key positions mapped to the physical keyboard image (percentage-based)
  // Each key has: x, y (top-left corner), width, height (all in %)
  const keyPositions: KeyPosition[] = [
    // Row 0: ESC, F1-F12, F13, PSCR, UP (0-15)
    { x: 2.8, y: 5, width: 5.5, height: 18 },    // 0: ESC
    { x: 10.2, y: 5, width: 5.5, height: 18 },   // 1: F1
    { x: 16.5, y: 5, width: 5.5, height: 18 },   // 2: F2
    { x: 22.8, y: 5, width: 5.5, height: 18 },   // 3: F3
    { x: 29.1, y: 5, width: 5.5, height: 18 },   // 4: F4
    { x: 35.8, y: 5, width: 5.5, height: 18 },   // 5: F5
    { x: 42.1, y: 5, width: 5.5, height: 18 },   // 6: F6
    { x: 48.4, y: 5, width: 5.5, height: 18 },   // 7: F7
    { x: 54.7, y: 5, width: 5.5, height: 18 },   // 8: F8
    { x: 61.4, y: 5, width: 5.5, height: 18 },   // 9: F9
    { x: 67.7, y: 5, width: 5.5, height: 18 },   // 10: F10
    { x: 74.0, y: 5, width: 5.5, height: 18 },   // 11: F11
    { x: 80.3, y: 5, width: 5.5, height: 18 },   // 12: F12
    { x: 86.9, y: 5, width: 5.5, height: 18 },   // 13: F13
    { x: 93.2, y: 5, width: 5.5, height: 18 },   // 14: Print
    { x: 99.2, y: 5, width: 0, height: 0 },      // 15: DEL (not visible in image)

    // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30)
    { x: 2.8, y: 24.5, width: 5.5, height: 18 },  // 16: ^
    { x: 9.1, y: 24.5, width: 5.5, height: 18 },  // 17: 1
    { x: 15.4, y: 24.5, width: 5.5, height: 18 }, // 18: 2
    { x: 21.7, y: 24.5, width: 5.5, height: 18 }, // 19: 3
    { x: 28.0, y: 24.5, width: 5.5, height: 18 }, // 20: 4
    { x: 34.3, y: 24.5, width: 5.5, height: 18 }, // 21: 5
    { x: 40.6, y: 24.5, width: 5.5, height: 18 }, // 22: 6
    { x: 46.9, y: 24.5, width: 5.5, height: 18 }, // 23: 7
    { x: 53.2, y: 24.5, width: 5.5, height: 18 }, // 24: 8
    { x: 59.5, y: 24.5, width: 5.5, height: 18 }, // 25: 9
    { x: 65.8, y: 24.5, width: 5.5, height: 18 }, // 26: 0
    { x: 72.1, y: 24.5, width: 5.5, height: 18 }, // 27: ß
    { x: 78.4, y: 24.5, width: 5.5, height: 18 }, // 28: =
    { x: 84.7, y: 24.5, width: 11.0, height: 18 }, // 29: Backspace
    { x: 96.5, y: 24.5, width: 5.5, height: 18 }, // 30: PGUP (down arrow)

    // Row 2: TAB, Q-P, Ü, +, PGDN (31-44)
    { x: 2.8, y: 43.5, width: 7.5, height: 18 },  // 31: Tab
    { x: 11.0, y: 43.5, width: 5.5, height: 18 }, // 32: Q
    { x: 17.3, y: 43.5, width: 5.5, height: 18 }, // 33: W
    { x: 23.6, y: 43.5, width: 5.5, height: 18 }, // 34: E
    { x: 29.9, y: 43.5, width: 5.5, height: 18 }, // 35: R
    { x: 36.2, y: 43.5, width: 5.5, height: 18 }, // 36: T
    { x: 42.5, y: 43.5, width: 5.5, height: 18 }, // 37: Z
    { x: 48.8, y: 43.5, width: 5.5, height: 18 }, // 38: U
    { x: 55.1, y: 43.5, width: 5.5, height: 18 }, // 39: I
    { x: 61.4, y: 43.5, width: 5.5, height: 18 }, // 40: O
    { x: 67.7, y: 43.5, width: 5.5, height: 18 }, // 41: P
    { x: 74.0, y: 43.5, width: 5.5, height: 18 }, // 42: Ü
    { x: 80.3, y: 43.5, width: 5.5, height: 18 }, // 43: +
    { x: 96.5, y: 43.5, width: 5.5, height: 18 }, // 44: PGDN (down arrow right)

    // Row 3: CAPS, A-L, Ö, Ä, #, ENT, HOME (45-59)
    { x: 2.8, y: 62.5, width: 9.0, height: 18 },  // 45: Caps Lock
    { x: 12.6, y: 62.5, width: 5.5, height: 18 }, // 46: A
    { x: 18.9, y: 62.5, width: 5.5, height: 18 }, // 47: S
    { x: 25.2, y: 62.5, width: 5.5, height: 18 }, // 48: D
    { x: 31.5, y: 62.5, width: 5.5, height: 18 }, // 49: F
    { x: 37.8, y: 62.5, width: 5.5, height: 18 }, // 50: G
    { x: 44.1, y: 62.5, width: 5.5, height: 18 }, // 51: H
    { x: 50.4, y: 62.5, width: 5.5, height: 18 }, // 52: J
    { x: 56.7, y: 62.5, width: 5.5, height: 18 }, // 53: K
    { x: 63.0, y: 62.5, width: 5.5, height: 18 }, // 54: L
    { x: 69.3, y: 62.5, width: 5.5, height: 18 }, // 55: Ö
    { x: 75.6, y: 62.5, width: 5.5, height: 18 }, // 56: Ä
    { x: 81.9, y: 62.5, width: 5.5, height: 18 }, // 57: #
    { x: 88.2, y: 62.5, width: 7.5, height: 18 }, // 58: Enter
    { x: 96.5, y: 62.5, width: 5.5, height: 18 }, // 59: HOME (page down)

    // Row 4: LSFT, <, Y-M, RSFT, UP, END (60-74)
    { x: 2.8, y: 81.5, width: 6.5, height: 18 },  // 60: Left Shift
    { x: 10.0, y: 81.5, width: 5.5, height: 18 }, // 61: < > |
    { x: 16.3, y: 81.5, width: 5.5, height: 18 }, // 62: Y
    { x: 22.6, y: 81.5, width: 5.5, height: 18 }, // 63: X
    { x: 28.9, y: 81.5, width: 5.5, height: 18 }, // 64: C
    { x: 35.2, y: 81.5, width: 5.5, height: 18 }, // 65: V
    { x: 41.5, y: 81.5, width: 5.5, height: 18 }, // 66: B
    { x: 47.8, y: 81.5, width: 5.5, height: 18 }, // 67: N
    { x: 54.1, y: 81.5, width: 5.5, height: 18 }, // 68: M
    { x: 60.4, y: 81.5, width: 5.5, height: 18 }, // 69: ;
    { x: 66.7, y: 81.5, width: 5.5, height: 18 }, // 70: :
    { x: 73.0, y: 81.5, width: 5.5, height: 18 }, // 71: -
    { x: 79.3, y: 81.5, width: 10.5, height: 18 }, // 72: Right Shift
    { x: 90.6, y: 81.5, width: 5.5, height: 18 }, // 73: Up
    { x: 96.5, y: 81.5, width: 5.5, height: 18 }, // 74: END (lightning)

    // Row 5: LCTL, MOD, ALT, SPC, ALTGR, FN, RCTL, LEFT, DOWN, RIGHT (75-84)
    { x: 2.8, y: 100, width: 6.5, height: 0 },    // 75: Left Ctrl (hidden bottom row)
    { x: 10.0, y: 100, width: 6.5, height: 0 },   // 76: Mod
    { x: 17.2, y: 100, width: 6.5, height: 0 },   // 77: Alt
    { x: 24.4, y: 100, width: 31.0, height: 0 },  // 78: Space
    { x: 56.2, y: 100, width: 6.5, height: 0 },   // 79: Alt Gr
    { x: 63.4, y: 100, width: 6.5, height: 0 },   // 80: Fn
    { x: 70.6, y: 100, width: 6.5, height: 0 },   // 81: Right Ctrl
    { x: 84.6, y: 100, width: 5.5, height: 0 },   // 82: Left
    { x: 90.6, y: 100, width: 5.5, height: 0 },   // 83: Down
    { x: 96.5, y: 100, width: 5.5, height: 0 },   // 84: Right
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
          if (pos.height === 0) return null; // Skip invisible keys

          return (
            <button
              key={index}
              onClick={() => onKeyClick(index)}
              className="absolute rounded-sm transition-all duration-200 hover:ring-2 hover:ring-brand-beige cursor-pointer"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
                backgroundColor: keyColors[index] || 'transparent',
                opacity: 0.7,
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
