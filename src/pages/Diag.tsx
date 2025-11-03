import { useState, useEffect, useRef } from 'react';
import { Activity, Download, Play, Square, RotateCcw, Save, Upload } from 'lucide-react';
import { HIDConnection } from '../lib/hid';
import {
  parseEdgeEvent,
  parseScanSummary,
  buildDiagEnable,
  buildDiagReset,
  buildSetDebounce,
  buildSetEager,
  buildSaveEeprom,
  buildLoadEeprom,
  MATRIX_CONFIG,
  isBitSet,
  EdgeEvent,
  ScanSummary
} from '../lib/diagProtocol';
import { DiagnosticAnalyzer } from '../utils/diagHeuristics';
import { downloadJSON, downloadPNG, createHeatmapCanvas, ExportData } from '../utils/exporters';
import DiagMatrix from '../components/DiagMatrix';
import DiagTimeline from '../components/DiagTimeline';
import DiagReportCard from '../components/DiagReportCard';

export default function Diag() {
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [events, setEvents] = useState<EdgeEvent[]>([]);
  const [scanSummaries, setScanSummaries] = useState<ScanSummary[]>([]);
  const [preDebounceState, setPreDebounceState] = useState<boolean[][]>(
    Array.from({ length: MATRIX_CONFIG.ROWS }, () => Array(MATRIX_CONFIG.COLS).fill(false))
  );
  const [postDebounceState, setPostDebounceState] = useState<boolean[][]>(
    Array.from({ length: MATRIX_CONFIG.ROWS }, () => Array(MATRIX_CONFIG.COLS).fill(false))
  );
  const [selectedKey, setSelectedKey] = useState<number | undefined>(undefined);
  const [testPhase, setTestPhase] = useState<string>('idle');
  const [sessionStart, setSessionStart] = useState<number>(0);
  const [isWebHIDSupported, setIsWebHIDSupported] = useState(true);

  const hidRef = useRef(new HIDConnection());
  const analyzerRef = useRef(new DiagnosticAnalyzer());

  useEffect(() => {
    if (!('hid' in navigator)) {
      setIsWebHIDSupported(false);
    }

    return () => {
      hidRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' && connected) {
        e.preventDefault();
        if (running) {
          handleStop();
        } else {
          handleStart();
        }
      } else if (e.key === 'r' && connected && !running) {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [connected, running]);

  const handleConnect = async () => {
    const success = await hidRef.current.requestDevice([
      { vendorId: 0x7470, usagePage: 0xff60 }
    ]);

    if (!success) return;

    try {
      const ok = await hidRef.current.connect();
      if (!ok) throw new Error('HID open failed');
    } catch (e) {
      console.error('Open failed:', e);
      return;
    }

    setConnected(hidRef.current.isConnected());
    setDeviceInfo(hidRef.current.getDeviceInfo());

    hidRef.current.onData((data) => {
      if (data[0] === 0x50) {
        const event = parseEdgeEvent(data);
        if (event) {
          setEvents(prev => [...prev, event]);
          analyzerRef.current.addEvent(event);

          if (event.phase === 2) {
            const row = Math.floor(event.key / MATRIX_CONFIG.COLS);
            const col = event.key % MATRIX_CONFIG.COLS;
            setPostDebounceState(prev => {
              const newState = prev.map(r => [...r]);
              newState[row][col] = event.kind === 1;
              return newState;
            });
          }
        }
      } else if (data[0] === 0x51) {
        const summary = parseScanSummary(data);
        if (summary) {
          setScanSummaries(prev => [...prev, summary]);

          const newPreState = Array.from({ length: MATRIX_CONFIG.ROWS }, () =>
            Array(MATRIX_CONFIG.COLS).fill(false)
          );

          for (let row = 0; row < summary.rows; row++) {
            for (let col = 0; col < summary.cols; col++) {
              newPreState[row][col] = isBitSet(summary.bitmap, row, col, summary.stride);
            }
          }

          setPreDebounceState(newPreState);
        }
      }
    });
  };

  const handleStart = async () => {
    try {
      await hidRef.current.ensureConnected();
      analyzerRef.current.reset();
      setEvents([]);
      setScanSummaries([]);
      setSessionStart(Date.now());
      setRunning(true);
      setTestPhase('single-keys');

      const enableCmd = buildDiagEnable(true, 4);
      await hidRef.current.sendReport(null, enableCmd);
    } catch (e) {
      console.error(e);
      setRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await hidRef.current.ensureConnected();
      await hidRef.current.sendReport(null, buildDiagEnable(false, 0));
      setRunning(false);
      setTestPhase('completed');
    } catch (e) {
      console.error(e);
      setRunning(false);
    }
  };

  const handleReset = async () => {
    try {
      await hidRef.current.ensureConnected();
      await hidRef.current.sendReport(null, buildDiagReset());
      analyzerRef.current.reset();
      setEvents([]);
      setScanSummaries([]);
      setPreDebounceState(
        Array.from({ length: MATRIX_CONFIG.ROWS }, () => Array(MATRIX_CONFIG.COLS).fill(false))
      );
      setPostDebounceState(
        Array.from({ length: MATRIX_CONFIG.ROWS }, () => Array(MATRIX_CONFIG.COLS).fill(false))
      );
      setTestPhase('idle');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyFix = async (recommendation: any) => {
    if (!recommendation.action) return;

    try {
      await hidRef.current.ensureConnected();
      const action = recommendation.action;

      if (action.type === 'debounce' && action.params) {
        const { key, increase } = action.params;
        await hidRef.current.sendReport(null, buildSetDebounce(key, 5 + increase));
      } else if (action.type === 'eager' && action.params) {
        const { enable } = action.params;
        for (let key = 0; key < MATRIX_CONFIG.KEY_COUNT; key++) {
          await hidRef.current.sendReport(null, buildSetEager(key, enable));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEeprom = async () => {
    try {
      await hidRef.current.ensureConnected();
      await hidRef.current.sendReport(null, buildSaveEeprom());
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadEeprom = async () => {
    try {
      await hidRef.current.ensureConnected();
      await hidRef.current.sendReport(null, buildLoadEeprom());
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJSON = () => {
    const stats = analyzerRef.current.getStats();
    const recommendations = analyzerRef.current.getRecommendations();

    const data: ExportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - sessionStart,
        deviceInfo
      },
      events,
      scanSummaries,
      statistics: stats,
      recommendations
    };

    downloadJSON(data, `keyboard-diag-${Date.now()}.json`);
  };

  const handleExportPNG = () => {
    const stats = analyzerRef.current.getStats();
    const canvas = createHeatmapCanvas(stats, 1200, 480);
    downloadPNG(canvas, `keyboard-heatmap-${Date.now()}.png`);
  };

  const stats = analyzerRef.current.getStats();
  const recommendations = analyzerRef.current.getRecommendations();

  return (
    <div className="min-h-screen bg-brand-brown py-8">
      <div className="max-w-7xl mx-auto px-4">
        {!isWebHIDSupported && (
          <div className="bg-red-900 bg-opacity-30 border border-red-500 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold mb-1 text-red-400">Browser Not Supported</p>
                <p>WebHID is not available in your browser. Please use Chrome 89+ or Edge 89+ to access keyboard diagnostics.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold mb-1">Privacy Notice</p>
              <p>This diagnostic tool only captures timing and matrix state data. No key content or text is transmitted or recorded. Works exclusively in Chrome/Edge browsers with WebHID support.</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold mb-1">Diagnostic Firmware Required</p>
              <p className="mb-2">To use this diagnostic tool, your keyboard must be flashed with the special diagnostic firmware.</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Download the diagnostic firmware from the DFU Flash page</li>
                <li>Flash it using the DFU bootloader (hold ESC while plugging in)</li>
                <li>After testing, flash back to your normal firmware</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-6">Keyboard Diagnostics</h1>

          <div className="flex flex-wrap gap-4 mb-6">
            {!connected ? (
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Activity className="w-5 h-5" />
                Connect Keyboard
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold">Connected</span>
                  {deviceInfo && (
                    <span className="text-gray-400 text-sm ml-2">
                      {deviceInfo.productName} (0x{deviceInfo.vendorId.toString(16).toUpperCase()}:0x{deviceInfo.productId.toString(16).toUpperCase()})
                    </span>
                  )}
                </div>

                {!running ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    Start Test
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    Stop Test
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={events.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Export JSON
                </button>

                <button
                  type="button"
                  onClick={handleExportPNG}
                  disabled={events.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Export Heatmap
                </button>

                <button
                  type="button"
                  onClick={handleSaveEeprom}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Save to EEPROM
                </button>

                <button
                  type="button"
                  onClick={handleLoadEeprom}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Load from EEPROM
                </button>
              </>
            )}
          </div>

          {running && (
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 p-4 rounded-lg">
              <h3 className="text-yellow-400 font-semibold mb-2">Test in Progress: {testPhase}</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>1. Press individual keys across the keyboard</li>
                <li>2. Try modifier combinations (Ctrl, Shift, Alt)</li>
                <li>3. Rapid WASD key mashing</li>
                <li>4. Hold keys for 2-3 seconds</li>
              </ul>
              <p className="text-gray-400 text-sm mt-2">
                Events collected: {events.length} | Duration: {Math.floor((Date.now() - sessionStart) / 1000)}s
              </p>
            </div>
          )}
        </div>

        {connected && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Live Matrix View</h2>
              <DiagMatrix
                preDebounceState={preDebounceState}
                postDebounceState={postDebounceState}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Event Timeline</h2>
              <DiagTimeline
                events={events}
                selectedKey={selectedKey}
              />
            </div>

            {events.length > 0 && (
              <DiagReportCard
                stats={stats}
                recommendations={recommendations}
                onApplyFix={handleApplyFix}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
