import { EdgeEvent, MATRIX_CONFIG } from '../lib/diagProtocol';

export interface DiagnosticStats {
  chatterRate: number[];
  chatterCount: number[];
  actuationCount: number[];
  stuckRows: Set<number>;
  stuckCols: Set<number>;
  ghostingCount: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  jitter: number;
}

export interface DiagnosticRecommendation {
  severity: 'info' | 'warning' | 'error';
  category: 'chatter' | 'stuck' | 'ghosting' | 'latency';
  message: string;
  keys?: number[];
  action?: {
    type: 'debounce' | 'eager' | 'hardware';
    params?: any;
  };
}

export class DiagnosticAnalyzer {
  private events: EdgeEvent[] = [];
  private lastEventTime: Map<number, number> = new Map();
  private chatterEvents: Map<number, number> = new Map();
  private actuations: Map<number, number> = new Map();
  private matrixState: boolean[][] = [];
  private ghostingEvents: number = 0;
  private latencies: number[] = [];

  constructor() {
    this.matrixState = Array.from({ length: MATRIX_CONFIG.ROWS }, () =>
      Array(MATRIX_CONFIG.COLS).fill(false)
    );
  }

  addEvent(event: EdgeEvent): void {
    this.events.push(event);

    if (event.phase === 2) {
      const lastTime = this.lastEventTime.get(event.key);

      if (lastTime !== undefined) {
        const deltaMs = (event.timestamp_us - lastTime) / 1000;

        if (deltaMs < 5) {
          this.chatterEvents.set(event.key, (this.chatterEvents.get(event.key) || 0) + 1);
        }

        this.latencies.push(deltaMs);
      }

      this.lastEventTime.set(event.key, event.timestamp_us);

      if (event.kind === 1) {
        this.actuations.set(event.key, (this.actuations.get(event.key) || 0) + 1);
      }

      const row = Math.floor(event.key / MATRIX_CONFIG.COLS);
      const col = event.key % MATRIX_CONFIG.COLS;
      this.matrixState[row][col] = event.kind === 1;

      this.checkGhosting();
    }
  }

  private checkGhosting(): void {
    for (let r1 = 0; r1 < MATRIX_CONFIG.ROWS - 1; r1++) {
      for (let r2 = r1 + 1; r2 < MATRIX_CONFIG.ROWS; r2++) {
        for (let c1 = 0; c1 < MATRIX_CONFIG.COLS - 1; c1++) {
          for (let c2 = c1 + 1; c2 < MATRIX_CONFIG.COLS; c2++) {
            const corners = [
              this.matrixState[r1][c1],
              this.matrixState[r1][c2],
              this.matrixState[r2][c1],
              this.matrixState[r2][c2]
            ];

            const activeCount = corners.filter(Boolean).length;
            if (activeCount === 3) {
              this.ghostingEvents++;
            }
          }
        }
      }
    }
  }

  getStats(): DiagnosticStats {
    const chatterRate: number[] = Array(MATRIX_CONFIG.KEY_COUNT).fill(0);
    const chatterCount: number[] = Array(MATRIX_CONFIG.KEY_COUNT).fill(0);
    const actuationCount: number[] = Array(MATRIX_CONFIG.KEY_COUNT).fill(0);

    for (let key = 0; key < MATRIX_CONFIG.KEY_COUNT; key++) {
      const chatter = this.chatterEvents.get(key) || 0;
      const acts = this.actuations.get(key) || 0;

      chatterCount[key] = chatter;
      actuationCount[key] = acts;

      if (acts > 0) {
        chatterRate[key] = (chatter / acts) * 100;
      }
    }

    const stuckRows = new Set<number>();
    const stuckCols = new Set<number>();

    for (let r = 0; r < MATRIX_CONFIG.ROWS; r++) {
      const allActive = this.matrixState[r].every(Boolean);
      const allInactive = this.matrixState[r].every(v => !v);
      if (allActive || allInactive) {
        stuckRows.add(r);
      }
    }

    for (let c = 0; c < MATRIX_CONFIG.COLS; c++) {
      const colValues = this.matrixState.map(row => row[c]);
      const allActive = colValues.every(Boolean);
      const allInactive = colValues.every(v => !v);
      if (allActive || allInactive) {
        stuckCols.add(c);
      }
    }

    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

    const jitter = sortedLatencies.length > 1
      ? Math.max(...sortedLatencies) - Math.min(...sortedLatencies)
      : 0;

    return {
      chatterRate,
      chatterCount,
      actuationCount,
      stuckRows,
      stuckCols,
      ghostingCount: this.ghostingEvents,
      latencyP50: p50,
      latencyP95: p95,
      latencyP99: p99,
      jitter
    };
  }

  getRecommendations(): DiagnosticRecommendation[] {
    const stats = this.getStats();
    const recommendations: DiagnosticRecommendation[] = [];

    for (let key = 0; key < MATRIX_CONFIG.KEY_COUNT; key++) {
      const rate = stats.chatterRate[key];

      if (rate > 1) {
        recommendations.push({
          severity: 'error',
          category: 'chatter',
          message: `Key ${key} has high chatter rate (${rate.toFixed(1)}%)`,
          keys: [key],
          action: {
            type: 'debounce',
            params: { key, increase: 2 }
          }
        });
      } else if (rate > 0.2) {
        recommendations.push({
          severity: 'warning',
          category: 'chatter',
          message: `Key ${key} has moderate chatter rate (${rate.toFixed(1)}%)`,
          keys: [key],
          action: {
            type: 'debounce',
            params: { key, increase: 1 }
          }
        });
      }
    }

    if (stats.stuckRows.size > 0) {
      recommendations.push({
        severity: 'error',
        category: 'stuck',
        message: `Stuck rows detected: ${Array.from(stats.stuckRows).join(', ')}`,
        action: {
          type: 'hardware',
          params: { type: 'row', indices: Array.from(stats.stuckRows) }
        }
      });
    }

    if (stats.stuckCols.size > 0) {
      recommendations.push({
        severity: 'error',
        category: 'stuck',
        message: `Stuck columns detected: ${Array.from(stats.stuckCols).join(', ')}`,
        action: {
          type: 'hardware',
          params: { type: 'col', indices: Array.from(stats.stuckCols) }
        }
      });
    }

    const ghostingRate = this.events.length > 0 ? (stats.ghostingCount / this.events.length) * 60000 : 0;
    if (ghostingRate > 5) {
      recommendations.push({
        severity: 'warning',
        category: 'ghosting',
        message: `High ghosting rate detected (${ghostingRate.toFixed(1)} events/min)`,
        action: {
          type: 'hardware',
          params: { type: 'diode', message: 'Check diodes in matrix' }
        }
      });
    }

    if (stats.latencyP95 > 50) {
      recommendations.push({
        severity: 'warning',
        category: 'latency',
        message: `High P95 latency (${stats.latencyP95.toFixed(1)}ms)`,
        action: {
          type: 'eager',
          params: { enable: true }
        }
      });
    }

    return recommendations;
  }

  reset(): void {
    this.events = [];
    this.lastEventTime.clear();
    this.chatterEvents.clear();
    this.actuations.clear();
    this.matrixState = Array.from({ length: MATRIX_CONFIG.ROWS }, () =>
      Array(MATRIX_CONFIG.COLS).fill(false)
    );
    this.ghostingEvents = 0;
    this.latencies = [];
  }
}
