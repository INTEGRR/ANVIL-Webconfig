import { useState } from 'react';
import { Bug, Send, Hash } from 'lucide-react';
import { keycodeToHex } from '../utils/keycodeConverter';

interface KeymapDebuggerProps {
  device: any;
  connected: boolean;
  onSendCommand: (keyIndex: number, keycode: number, layer: number) => Promise<void>;
  showIndexes: boolean;
  onToggleIndexes: (show: boolean) => void;
}

export default function KeymapDebugger({ device, connected, onSendCommand, showIndexes, onToggleIndexes }: KeymapDebuggerProps) {
  const [keyIndex, setKeyIndex] = useState('0');
  const [keycodeStr, setKeycodeStr] = useState('KC_A');
  const [layer, setLayer] = useState('0');
  const [testResult, setTestResult] = useState<string>('');

  const testSingleKey = async () => {
    if (!connected || !device) {
      setTestResult('❌ Not connected to keyboard');
      return;
    }

    try {
      const idx = parseInt(keyIndex);
      const lyr = parseInt(layer);
      const keycodeValue = keycodeToHex(keycodeStr);

      setTestResult(`🔄 Testing key ${idx} with ${keycodeStr} (0x${keycodeValue.toString(16)})...`);

      await onSendCommand(idx, keycodeValue, lyr);

      setTestResult(`✅ Sent successfully! Check console for details.`);
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
    }
  };

  const testReadKeycode = async () => {
    if (!connected || !device) {
      setTestResult('❌ Not connected to keyboard');
      return;
    }

    try {
      const idx = parseInt(keyIndex);
      const lyr = parseInt(layer);
      setTestResult(`🔍 Attempting to read keycode from key ${idx}...`);

      const data = new Uint8Array(32);
      data[0] = 0x06;
      data[1] = lyr;
      data[2] = idx;

      console.log('📤 Sending read command (0x06):', Array.from(data.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

      await device.sendReport(0, data);

      const responsePromise = new Promise((resolve) => {
        device.addEventListener('inputreport', (event: any) => {
          const response = new Uint8Array(event.data.buffer);
          console.log('📥 Read response:', Array.from(response).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

          if (response[0] === 0x06) {
            const keycode = (response[3] << 8) | response[4];
            console.log(`✅ Keycode read: 0x${keycode.toString(16).padStart(4, '0')}`);
            setTestResult(`✅ Read keycode: 0x${keycode.toString(16).padStart(4, '0')} from key ${idx}`);
          }

          resolve(response);
        }, { once: true });

        setTimeout(() => resolve(null), 1000);
      });

      const response = await responsePromise;

      if (!response) {
        setTestResult(`⚠️ No response within 1 second.`);
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
    }
  };

  if (!connected) {
    return (
      <div className="bg-brand-teal/40 rounded-xl border border-brand-sage/20 p-4 opacity-50">
        <div className="flex items-center gap-2 text-brand-sage text-sm">
          <Bug className="w-4 h-4" />
          <span>Connect keyboard to enable debugging</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Bug className="w-5 h-5 text-brand-beige" />
        Keymap Debugger
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showIndexes}
              onChange={(e) => onToggleIndexes(e.target.checked)}
              className="w-4 h-4 rounded border-brand-sage/30 bg-brand-teal/60 text-brand-beige focus:ring-brand-beige"
            />
            <span className="text-sm text-brand-sage flex items-center gap-1">
              <Hash className="w-4 h-4" />
              Show Key Indexes
            </span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-brand-sage mb-1">Key Index</label>
            <input
              type="number"
              value={keyIndex}
              onChange={(e) => setKeyIndex(e.target.value)}
              min="0"
              max="84"
              className="w-full bg-brand-teal/60 text-white px-3 py-2 rounded-lg border border-brand-sage/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-sage mb-1">Keycode</label>
            <input
              type="text"
              value={keycodeStr}
              onChange={(e) => setKeycodeStr(e.target.value)}
              placeholder="KC_A"
              className="w-full bg-brand-teal/60 text-white px-3 py-2 rounded-lg border border-brand-sage/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-sage mb-1">Layer</label>
            <input
              type="number"
              value={layer}
              onChange={(e) => setLayer(e.target.value)}
              min="0"
              max="3"
              className="w-full bg-brand-teal/60 text-white px-3 py-2 rounded-lg border border-brand-sage/30 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={testSingleKey}
            className="flex-1 bg-brand-beige hover:bg-brand-beige/90 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Test Write
          </button>

          <button
            onClick={testReadKeycode}
            className="flex-1 bg-brand-teal/60 hover:bg-brand-teal/80 text-white py-2 px-4 rounded-lg font-semibold transition-colors border border-brand-sage/30 flex items-center justify-center gap-2 text-sm"
          >
            <Bug className="w-4 h-4" />
            Test Read
          </button>
        </div>

        {testResult && (
          <div className="bg-brand-teal/60 rounded-lg p-3 border border-brand-sage/20">
            <p className="text-white text-sm font-mono whitespace-pre-wrap">{testResult}</p>
          </div>
        )}

        <div className="bg-brand-teal/40 rounded-lg p-3 border border-brand-sage/20">
          <p className="text-brand-sage text-xs leading-relaxed">
            <strong className="text-brand-blue">Protocol (Fixed):</strong><br />
            • <span className="text-green-400">Command 0x05</span> = Write keycode: [cmd, layer, <strong>keyIndex</strong>, keycode_hi, keycode_lo]<br />
            • <span className="text-green-400">Command 0x06</span> = Read keycode: [cmd, layer, <strong>keyIndex</strong>]<br />
            • Check browser console (F12) for detailed packet logs<br />
            <br />
            <strong className="text-brand-blue">Expected Response:</strong><br />
            • Write success: `0x05 0x01 0x00...`<br />
            • Read success: `0x06 [layer] [keyIndex] [keycode_hi] [keycode_lo]`<br />
            • Keymaps are stored in VIA dynamic keymap (EEPROM)
          </p>
        </div>
      </div>
    </div>
  );
}
