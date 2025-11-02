import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Zap, Info } from 'lucide-react';
import { dfu } from '../lib/dfu';

interface LogEntry {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
}

export default function DFUFlash() {
  const [device, setDevice] = useState<any | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const handleConnectDevice = async () => {
    try {
      addLog('info', 'Requesting DFU device...');

      const usbDevice = await navigator.usb.requestDevice({
        filters: [{ classCode: 0xFE, subclassCode: 0x01 }]
      });

      const interfaces = dfu.findDeviceDfuInterfaces(usbDevice);
      if (interfaces.length === 0) {
        addLog('error', 'No DFU interface found');
        return;
      }

      const dfuDevice = new dfu.Device(usbDevice, interfaces[0]);

      addLog('info', 'Opening device connection...');
      await dfuDevice.open();

      dfuDevice.logInfo = (msg: string) => addLog('info', msg);
      dfuDevice.logWarning = (msg: string) => addLog('warning', msg);
      dfuDevice.logError = (msg: string) => addLog('error', msg);
      dfuDevice.logProgress = (done: number, total?: number) => {
        if (total) {
          setProgress(Math.round((done / total) * 100));
        }
      };

      addLog('success', `Device connected`);
      setDevice(dfuDevice);
    } catch (error) {
      addLog('error', `Connection failed: ${error}`);
    }
  };

  const handleDisconnect = async () => {
    if (device) {
      try {
        await device.close();
        addLog('info', 'Device disconnected');
      } catch (error) {
        addLog('warning', `Disconnect warning: ${error}`);
      }
      setDevice(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      addLog('info', `Selected file: ${file.name} (${file.size} bytes)`);
    }
  };

  const handleFlash = async () => {
    if (!device || !selectedFile) {
      addLog('error', 'Please connect device and select firmware file');
      return;
    }

    setIsFlashing(true);
    setProgress(0);

    try {
      addLog('info', 'Reading firmware file...');
      const arrayBuffer = await selectedFile.arrayBuffer();

      addLog('info', 'Preparing device for flashing...');
      await device.abortToIdle();

      const state = await device.getState();
      if (state !== dfu.dfuIDLE) {
        throw new Error(`Device not in idle state (state: ${state})`);
      }

      const transferSize = 1024;
      const manifestationTolerant = false;

      addLog('info', 'Starting firmware download...');
      await device.do_download(transferSize, arrayBuffer, manifestationTolerant);

      addLog('success', 'Firmware flashed successfully!');
      setProgress(100);

      if (!manifestationTolerant) {
        addLog('info', 'Resetting device...');
        try {
          await device.waitDisconnected(5000);
          addLog('success', 'Device reset complete');
        } catch {
          addLog('warning', 'Device did not disconnect (may need manual reset)');
        }
      }

    } catch (error) {
      addLog('error', `Flashing failed: ${error}`);
    } finally {
      setIsFlashing(false);
    }
  };

  const handleReadFirmware = async () => {
    if (!device) {
      addLog('error', 'Please connect a device first');
      return;
    }

    setIsFlashing(true);
    setProgress(0);

    try {
      addLog('info', 'Preparing device for reading...');
      await device.abortToIdle();

      const transferSize = 1024;
      const maxSize = 256 * 1024;

      addLog('info', 'Reading firmware from device...');
      const firmware = await device.do_upload(transferSize, maxSize);

      const blob = firmware;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'firmware_backup.bin';
      a.click();
      URL.revokeObjectURL(url);

      addLog('success', `Firmware read successfully (${firmware.size} bytes)`);
      setProgress(100);

    } catch (error) {
      addLog('error', `Reading failed: ${error}`);
    } finally {
      setIsFlashing(false);
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Zap className="w-8 h-8 text-blue-600" />
          WebDFU Firmware Flasher
        </h1>
        <p className="text-gray-600">
          Flash firmware to your keyboard using USB Device Firmware Upgrade (DFU)
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Browser Compatibility</p>
            <p>WebDFU requires Chrome/Chromium browser. Make sure your device is in DFU mode before connecting.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Device Connection</h2>

          <div className="space-y-4">
            {!device ? (
              <button
                onClick={handleConnectDevice}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Connect Device
              </button>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Device Connected
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Firmware File</h2>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".bin,.hex,.dfu"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!device}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Select Firmware
            </button>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleFlash}
            disabled={!device || !selectedFile || isFlashing}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Flash Firmware
          </button>

          <button
            onClick={handleReadFirmware}
            disabled={!device || isFlashing}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Read Firmware
          </button>
        </div>

        {isFlashing && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Activity Log</h2>

        <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No activity yet...</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-gray-200">
                  {getLogIcon(log.type)}
                  <span className="text-gray-500 text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Log
          </button>
        )}
      </div>
    </div>
  );
}
