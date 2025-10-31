export interface KeyData {
  index: number;
  label: string;
  keyCode: string;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
}

export const KEYBOARD_LAYOUT: KeyData[] = [
  // Row 0: ESC, F1-F12, F13, PSCR, DEL (0-15)
  { index: 0, label: 'ESC', keyCode: 'KC_ESC', x: 0, y: 0, width: 1, height: 1, row: 0 },
  { index: 1, label: 'F1', keyCode: 'KC_F1', x: 2, y: 0, width: 1, height: 1, row: 0 },
  { index: 2, label: 'F2', keyCode: 'KC_F2', x: 3, y: 0, width: 1, height: 1, row: 0 },
  { index: 3, label: 'F3', keyCode: 'KC_F3', x: 4, y: 0, width: 1, height: 1, row: 0 },
  { index: 4, label: 'F4', keyCode: 'KC_F4', x: 5, y: 0, width: 1, height: 1, row: 0 },
  { index: 5, label: 'F5', keyCode: 'KC_F5', x: 6.5, y: 0, width: 1, height: 1, row: 0 },
  { index: 6, label: 'F6', keyCode: 'KC_F6', x: 7.5, y: 0, width: 1, height: 1, row: 0 },
  { index: 7, label: 'F7', keyCode: 'KC_F7', x: 8.5, y: 0, width: 1, height: 1, row: 0 },
  { index: 8, label: 'F8', keyCode: 'KC_F8', x: 9.5, y: 0, width: 1, height: 1, row: 0 },
  { index: 9, label: 'F9', keyCode: 'KC_F9', x: 11, y: 0, width: 1, height: 1, row: 0 },
  { index: 10, label: 'F10', keyCode: 'KC_F10', x: 12, y: 0, width: 1, height: 1, row: 0 },
  { index: 11, label: 'F11', keyCode: 'KC_F11', x: 13, y: 0, width: 1, height: 1, row: 0 },
  { index: 12, label: 'F12', keyCode: 'KC_F12', x: 14, y: 0, width: 1, height: 1, row: 0 },
  { index: 13, label: 'F13', keyCode: 'KC_F13', x: 15.25, y: 0, width: 1, height: 1, row: 0 },
  { index: 14, label: 'PSCR', keyCode: 'KC_PSCR', x: 16.25, y: 0, width: 1, height: 1, row: 0 },
  { index: 15, label: 'DEL', keyCode: 'KC_DEL', x: 17.25, y: 0, width: 1, height: 1, row: 0 },

  // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30)
  { index: 16, label: '`', keyCode: 'KC_GRV', x: 0, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 17, label: '1', keyCode: 'KC_1', x: 1, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 18, label: '2', keyCode: 'KC_2', x: 2, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 19, label: '3', keyCode: 'KC_3', x: 3, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 20, label: '4', keyCode: 'KC_4', x: 4, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 21, label: '5', keyCode: 'KC_5', x: 5, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 22, label: '6', keyCode: 'KC_6', x: 6, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 23, label: '7', keyCode: 'KC_7', x: 7, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 24, label: '8', keyCode: 'KC_8', x: 8, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 25, label: '9', keyCode: 'KC_9', x: 9, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 26, label: '0', keyCode: 'KC_0', x: 10, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 27, label: '-', keyCode: 'KC_MINS', x: 11, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 28, label: '=', keyCode: 'KC_EQL', x: 12, y: 1.25, width: 1, height: 1, row: 1 },
  { index: 29, label: 'BSPC', keyCode: 'KC_BSPC', x: 13, y: 1.25, width: 2, height: 1, row: 1 },
  { index: 30, label: 'PGUP', keyCode: 'KC_PGUP', x: 15.25, y: 1.25, width: 1, height: 1, row: 1 },

  // Row 2: TAB, Q-P, LBRC, RBRC, PGDN (31-44)
  { index: 31, label: 'TAB', keyCode: 'KC_TAB', x: 0, y: 2.25, width: 1.5, height: 1, row: 2 },
  { index: 32, label: 'Q', keyCode: 'KC_Q', x: 1.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 33, label: 'W', keyCode: 'KC_W', x: 2.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 34, label: 'E', keyCode: 'KC_E', x: 3.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 35, label: 'R', keyCode: 'KC_R', x: 4.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 36, label: 'T', keyCode: 'KC_T', x: 5.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 37, label: 'Y', keyCode: 'KC_Y', x: 6.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 38, label: 'U', keyCode: 'KC_U', x: 7.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 39, label: 'I', keyCode: 'KC_I', x: 8.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 40, label: 'O', keyCode: 'KC_O', x: 9.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 41, label: 'P', keyCode: 'KC_P', x: 10.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 42, label: '[', keyCode: 'KC_LBRC', x: 11.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 43, label: ']', keyCode: 'KC_RBRC', x: 12.5, y: 2.25, width: 1, height: 1, row: 2 },
  { index: 44, label: 'PGDN', keyCode: 'KC_PGDN', x: 15.25, y: 2.25, width: 1, height: 1, row: 2 },

  // Row 3: CAPS, A-L, SCLN, QUOT, NUHS, ENT, HOME (45-59)
  { index: 45, label: 'CAPS', keyCode: 'KC_CAPS', x: 0, y: 3.25, width: 1.75, height: 1, row: 3 },
  { index: 46, label: 'A', keyCode: 'KC_A', x: 1.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 47, label: 'S', keyCode: 'KC_S', x: 2.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 48, label: 'D', keyCode: 'KC_D', x: 3.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 49, label: 'F', keyCode: 'KC_F', x: 4.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 50, label: 'G', keyCode: 'KC_G', x: 5.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 51, label: 'H', keyCode: 'KC_H', x: 6.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 52, label: 'J', keyCode: 'KC_J', x: 7.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 53, label: 'K', keyCode: 'KC_K', x: 8.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 54, label: 'L', keyCode: 'KC_L', x: 9.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 55, label: ';', keyCode: 'KC_SCLN', x: 10.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 56, label: "'", keyCode: 'KC_QUOT', x: 11.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 57, label: '#', keyCode: 'KC_NUHS', x: 12.75, y: 3.25, width: 1, height: 1, row: 3 },
  { index: 58, label: 'ENT', keyCode: 'KC_ENT', x: 13.75, y: 2.25, width: 1.5, height: 2, row: 3 },
  { index: 59, label: 'HOME', keyCode: 'KC_HOME', x: 15.25, y: 3.25, width: 1, height: 1, row: 3 },

  // Row 4: LSFT, NUBS, Z-M, COMM, DOT, SLSH, RSFT, UP, END (60-74)
  { index: 60, label: 'LSFT', keyCode: 'KC_LSFT', x: 0, y: 4.25, width: 1.25, height: 1, row: 4 },
  { index: 61, label: '\\', keyCode: 'KC_NUBS', x: 1.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 62, label: 'Z', keyCode: 'KC_Z', x: 2.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 63, label: 'X', keyCode: 'KC_X', x: 3.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 64, label: 'C', keyCode: 'KC_C', x: 4.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 65, label: 'V', keyCode: 'KC_V', x: 5.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 66, label: 'B', keyCode: 'KC_B', x: 6.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 67, label: 'N', keyCode: 'KC_N', x: 7.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 68, label: 'M', keyCode: 'KC_M', x: 8.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 69, label: ',', keyCode: 'KC_COMM', x: 9.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 70, label: '.', keyCode: 'KC_DOT', x: 10.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 71, label: '/', keyCode: 'KC_SLSH', x: 11.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 72, label: 'RSFT', keyCode: 'KC_RSFT', x: 12.25, y: 4.25, width: 1.75, height: 1, row: 4 },
  { index: 73, label: '↑', keyCode: 'KC_UP', x: 14.25, y: 4.25, width: 1, height: 1, row: 4 },
  { index: 74, label: 'END', keyCode: 'KC_END', x: 15.25, y: 4.25, width: 1, height: 1, row: 4 },

  // Row 5: LCTL, LGUI, LALT, SPC, RALT, FN, RCTL, LEFT, DOWN, RGHT (75-84)
  { index: 75, label: 'LCTL', keyCode: 'KC_LCTL', x: 0, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 76, label: 'LGUI', keyCode: 'KC_LGUI', x: 1.25, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 77, label: 'LALT', keyCode: 'KC_LALT', x: 2.5, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 78, label: 'SPACE', keyCode: 'KC_SPC', x: 3.75, y: 5.25, width: 6.25, height: 1, row: 5 },
  { index: 79, label: 'RALT', keyCode: 'KC_RALT', x: 10, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 80, label: 'FN', keyCode: 'MO(1)', x: 11.25, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 81, label: 'RCTL', keyCode: 'KC_RCTL', x: 12.5, y: 5.25, width: 1.25, height: 1, row: 5 },
  { index: 82, label: '←', keyCode: 'KC_LEFT', x: 13.25, y: 5.25, width: 1, height: 1, row: 5 },
  { index: 83, label: '↓', keyCode: 'KC_DOWN', x: 14.25, y: 5.25, width: 1, height: 1, row: 5 },
  { index: 84, label: '→', keyCode: 'KC_RGHT', x: 15.25, y: 5.25, width: 1, height: 1, row: 5 },
];

export const DEFAULT_COLORS: number[][] = [
  // Row 0
  [0, 255, 255], [42, 255, 255], [42, 255, 255], [42, 255, 255], [42, 255, 255],
  [85, 255, 255], [85, 255, 255], [85, 255, 255], [85, 255, 255],
  [127, 255, 255], [127, 255, 255], [127, 255, 255], [127, 255, 255],
  [170, 255, 255], [170, 255, 255], [170, 255, 255],

  // Row 1
  [0, 255, 200], [21, 255, 200], [21, 255, 200], [21, 255, 200], [21, 255, 200],
  [21, 255, 200], [21, 255, 200], [21, 255, 200], [21, 255, 200], [21, 255, 200],
  [21, 255, 200], [21, 255, 200], [21, 255, 200], [0, 255, 200], [200, 255, 200],

  // Row 2
  [127, 255, 200], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [42, 200, 255], [200, 255, 200],

  // Row 3
  [170, 255, 200], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [42, 200, 255], [127, 255, 200], [200, 255, 200],

  // Row 4
  [170, 255, 200], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255], [42, 200, 255],
  [42, 200, 255], [42, 200, 255], [170, 255, 200], [212, 255, 255], [200, 255, 200],

  // Row 5
  [170, 255, 200], [170, 255, 200], [170, 255, 200], [85, 200, 255], [170, 255, 200],
  [170, 255, 200], [170, 255, 200], [212, 255, 255], [212, 255, 255], [212, 255, 255],
  [200, 255, 200],
];
