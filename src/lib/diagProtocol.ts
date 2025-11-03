export const DIAG_COMMANDS = {
  EDGE: 0x50,
  SCAN_SUMMARY: 0x51,
  METRICS_DUMP: 0x52,
  DIAG_ENABLE: 0x5A,
  DIAG_RESET: 0x5B,
  SET_DEBOUNCE: 0x5C,
  SET_EAGER: 0x5D,
  SAVE_EEPROM: 0x4A,
  LOAD_EEPROM: 0x4B,
  SET_SCANMASK: 0x5E
} as const;

export const MATRIX_CONFIG = {
  ROWS: 6,
  COLS: 15,
  KEY_COUNT: 85,
  STRIDE: Math.ceil(15 / 8)
} as const;

export interface EdgeEvent {
  cmd: number;
  key: number;
  phase: 1 | 2;
  kind: 0 | 1;
  timestamp_us: number;
  scan_id: number;
}

export interface ScanSummary {
  cmd: number;
  rows: number;
  cols: number;
  stride: number;
  timestamp_us: number;
  scan_id: number;
  bitmap: Uint8Array;
}

export interface MetricsDump {
  cmd: number;
  actuations: Uint32Array;
  chatter: Uint32Array;
  ghost_events: number;
  stuck_rows: number;
  stuck_cols: number;
}

export function parseEdgeEvent(data: Uint8Array): EdgeEvent | null {
  if (data.length < 12 || data[0] !== DIAG_COMMANDS.EDGE) {
    return null;
  }

  return {
    cmd: data[0],
    key: data[1],
    phase: data[2] as 1 | 2,
    kind: data[3] as 0 | 1,
    timestamp_us: (data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)) >>> 0,
    scan_id: (data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24)) >>> 0
  };
}

export function parseScanSummary(data: Uint8Array): ScanSummary | null {
  if (data.length < 12 || data[0] !== DIAG_COMMANDS.SCAN_SUMMARY) {
    return null;
  }

  const rows = data[1];
  const cols = data[2];
  const stride = data[3];
  const bitmapSize = rows * stride;

  if (data.length < 12 + bitmapSize) {
    return null;
  }

  return {
    cmd: data[0],
    rows,
    cols,
    stride,
    timestamp_us: (data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)) >>> 0,
    scan_id: (data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24)) >>> 0,
    bitmap: data.slice(12, 12 + bitmapSize)
  };
}

export function parseMetricsDump(data: Uint8Array): MetricsDump | null {
  if (data.length < 1 || data[0] !== DIAG_COMMANDS.METRICS_DUMP) {
    return null;
  }

  const keyCount = MATRIX_CONFIG.KEY_COUNT;
  const expectedSize = 1 + keyCount * 8 + 12;

  if (data.length < expectedSize) {
    return null;
  }

  const actuations = new Uint32Array(keyCount);
  const chatter = new Uint32Array(keyCount);

  for (let i = 0; i < keyCount; i++) {
    const offset = 1 + i * 4;
    actuations[i] = (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
  }

  for (let i = 0; i < keyCount; i++) {
    const offset = 1 + keyCount * 4 + i * 4;
    chatter[i] = (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
  }

  const metaOffset = 1 + keyCount * 8;
  return {
    cmd: data[0],
    actuations,
    chatter,
    ghost_events: (data[metaOffset] | (data[metaOffset + 1] << 8) | (data[metaOffset + 2] << 16) | (data[metaOffset + 3] << 24)) >>> 0,
    stuck_rows: data[metaOffset + 4],
    stuck_cols: data[metaOffset + 5]
  };
}

export function buildDiagEnable(enable: boolean, scanDiv: number): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.DIAG_ENABLE;
  data[1] = enable ? 1 : 0;
  data[2] = scanDiv;
  return data;
}

export function buildDiagReset(): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.DIAG_RESET;
  return data;
}

export function buildSetDebounce(key: number, ms: number): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.SET_DEBOUNCE;
  data[1] = key;
  data[2] = ms;
  return data;
}

export function buildSetEager(key: number, on: boolean): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.SET_EAGER;
  data[1] = key;
  data[2] = on ? 1 : 0;
  return data;
}

export function buildSaveEeprom(): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.SAVE_EEPROM;
  return data;
}

export function buildLoadEeprom(): Uint8Array {
  const data = new Uint8Array(32);
  data[0] = DIAG_COMMANDS.LOAD_EEPROM;
  return data;
}

export function isBitSet(bitmap: Uint8Array, row: number, col: number, stride: number): boolean {
  const byteIndex = row * stride + Math.floor(col / 8);
  const bitIndex = col % 8;
  return (bitmap[byteIndex] & (1 << bitIndex)) !== 0;
}
