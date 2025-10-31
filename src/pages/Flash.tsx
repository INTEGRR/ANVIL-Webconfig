import { useState, useRef } from 'react';
import { Upload, Usb, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface FlashStatus {
  type: 'idle' | 'connecting' | 'flashing' | 'success' | 'error';
  message: string;
}

export default function Flash() {
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FlashStatus>({ type: 'idle', message: '' });
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkWebUSBSupport = () => {
    if (!('usb' in navigator)) {
      setStatus({
        type: 'error',
        message: 'WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.',
      });
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.bin', '.hex', '.uf2'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(extension)) {
      setStatus({
        type: 'error',
        message: 'Invalid file type. Please upload a .bin, .hex, or .uf2 file.',
      });
      return;
    }

    setFirmwareFile(file);
    setStatus({
      type: 'idle',
      message: `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
    });
  };

  const connectToDevice = async () => {
    if (!checkWebUSBSupport()) return;

    try {
      setLogs([]);
      addLog('Requesting USB device access...');
      setStatus({ type: 'connecting', message: 'Requesting USB device access...' });

      const selectedDevice = await navigator.usb.requestDevice({
        filters: [],
      });

      addLog(`Device selected: ${selectedDevice.productName || 'Unknown Device'}`);
      addLog(`Vendor ID: 0x${selectedDevice.vendorId.toString(16).padStart(4, '0')}`);
      addLog(`Product ID: 0x${selectedDevice.productId.toString(16).padStart(4, '0')}`);
      addLog(`Manufacturer: ${selectedDevice.manufacturerName || 'Unknown'}`);

      addLog('Opening device...');
      await selectedDevice.open();
      addLog('Device opened successfully');

      addLog(`Configurations available: ${selectedDevice.configurations.length}`);
      if (selectedDevice.configuration) {
        addLog(`Active configuration: ${selectedDevice.configuration.configurationValue}`);
        addLog(`Interfaces available: ${selectedDevice.configuration.interfaces.length}`);
        selectedDevice.configuration.interfaces.forEach((iface, idx) => {
          addLog(`  Interface ${idx}: ${iface.interfaceNumber}, Endpoints: ${iface.alternate.endpoints.length}`);
        });
      }

      setDevice(selectedDevice);
      setStatus({
        type: 'success',
        message: `Connected to: ${selectedDevice.productName || 'Unknown Device'}`,
      });
      addLog('Ready to flash!');
    } catch (error: any) {
      console.error('Connection error:', error);
      addLog(`ERROR: ${error.message}`);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to connect to device. Make sure the keyboard is in bootloader mode.',
      });
    }
  };

  const flashFirmware = async () => {
    if (!device || !firmwareFile) {
      setStatus({
        type: 'error',
        message: 'Please connect to a device and select a firmware file first.',
      });
      return;
    }

    try {
      addLog('Starting flash process...');
      setStatus({ type: 'flashing', message: 'Reading firmware file...' });
      addLog(`Reading firmware file: ${firmwareFile.name}`);
      const arrayBuffer = await firmwareFile.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      addLog(`Firmware size: ${data.length} bytes`);

      setStatus({ type: 'flashing', message: 'Preparing device...' });

      if (device.configuration === null) {
        addLog('Selecting configuration 1...');
        await device.selectConfiguration(1);
        addLog('Configuration selected');
      } else {
        addLog(`Using active configuration: ${device.configuration.configurationValue}`);
      }

      addLog('Detecting available endpoints...');
      const iface = device.configuration!.interfaces[0];
      const alternate = iface.alternate;
      addLog(`Interface ${iface.interfaceNumber} has ${alternate.endpoints.length} endpoints`);

      let outEndpoint: number | null = null;
      alternate.endpoints.forEach((ep) => {
        const direction = ep.direction === 'out' ? 'OUT' : 'IN';
        addLog(`  Endpoint ${ep.endpointNumber}: ${direction}, type: ${ep.type}`);
        if (ep.direction === 'out') {
          outEndpoint = ep.endpointNumber;
        }
      });

      if (outEndpoint === null) {
        addLog('ERROR: No OUT endpoint found!');
        throw new Error('No OUT endpoint available on this device');
      }

      addLog(`Using OUT endpoint: ${outEndpoint}`);

      addLog('Claiming interface 0...');
      try {
        await device.claimInterface(0);
        addLog('Interface claimed successfully');
      } catch (error: any) {
        addLog(`ERROR claiming interface: ${error.message}`);
        throw error;
      }

      const chunkSize = 64;
      const totalChunks = Math.ceil(data.length / chunkSize);
      addLog(`Total chunks to transfer: ${totalChunks} (${chunkSize} bytes each)`);

      setStatus({ type: 'flashing', message: 'Flashing firmware...' });
      addLog('Starting data transfer...');

      let successfulTransfers = 0;
      let failedTransfers = 0;

      for (let i = 0; i < totalChunks; i++) {
        const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);

        try {
          const result = await device.transferOut(outEndpoint, chunk);
          successfulTransfers++;
          if (i % 100 === 0) {
            addLog(`Transferred chunk ${i + 1}/${totalChunks} (${result.bytesWritten} bytes)`);
          }
        } catch (error: any) {
          failedTransfers++;
          if (failedTransfers < 10) {
            addLog(`WARNING: Transfer ${i + 1} failed: ${error.message}`);
          }
        }

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(currentProgress);
        setStatus({
          type: 'flashing',
          message: `Flashing: ${currentProgress}%`,
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      addLog(`Transfer complete: ${successfulTransfers} successful, ${failedTransfers} failed`);
      addLog('Releasing interface...');
      await device.releaseInterface(0);
      addLog('Closing device...');
      await device.close();

      setStatus({
        type: 'success',
        message: 'Firmware flashed successfully! Your keyboard will reboot shortly.',
      });
      setProgress(100);
      addLog('Flash completed successfully!');
      setDevice(null);
    } catch (error: any) {
      console.error('Flash error:', error);
      addLog(`FATAL ERROR: ${error.message}`);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to flash firmware. Please try again.',
      });

      if (device) {
        try {
          addLog('Attempting to close device after error...');
          await device.close();
          addLog('Device closed');
        } catch (e: any) {
          console.error('Error closing device:', e);
          addLog(`Error closing device: ${e.message}`);
        }
        setDevice(null);
      }
    }
  };

  const downloadSampleFirmware = () => {
    window.open('https://github.com/qmk/qmk_firmware/releases', '_blank');
  };

  return (
    <div className="min-h-screen bg-brand-brown">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Flash Firmware</h1>
          <p className="text-brand-sage text-lg">
            Upload and flash firmware directly to your keyboard using WebUSB
          </p>
        </div>

        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm text-brand-blue">
              <p className="font-semibold mb-2">Before you start:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This feature requires Chrome, Edge, or Opera browser</li>
                <li>Put your keyboard in bootloader mode (usually hold reset button or press Boot + Reset)</li>
                <li>Make sure you have the correct firmware file for your keyboard</li>
                <li>Flashing incorrect firmware may brick your device</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Upload className="w-6 h-6 text-brand-beige" />
              <h2 className="text-2xl font-bold text-white">Step 1: Select Firmware</h2>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin,.hex,.uf2"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-brand-teal/60 hover:bg-brand-teal/80 text-white px-6 py-4 rounded-lg border-2 border-dashed border-brand-sage/30 hover:border-brand-beige/50 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-brand-beige" />
                  <span className="font-medium">Click to upload firmware</span>
                  <span className="text-sm text-brand-sage">Supported: .bin, .hex, .uf2</span>
                </button>
              </div>

              {firmwareFile && (
                <div className="bg-brand-brown/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-white font-medium">{firmwareFile.name}</p>
                      <p className="text-brand-sage text-sm">
                        Size: {(firmwareFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={downloadSampleFirmware}
                className="w-full bg-brand-teal/40 hover:bg-brand-teal/60 text-brand-blue hover:text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Get QMK Firmware
              </button>
            </div>
          </div>

          <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Usb className="w-6 h-6 text-brand-beige" />
              <h2 className="text-2xl font-bold text-white">Step 2: Connect Device</h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={connectToDevice}
                disabled={status.type === 'connecting' || status.type === 'flashing'}
                className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status.type === 'connecting' ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : device ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Connected
                  </>
                ) : (
                  <>
                    <Usb className="w-5 h-5" />
                    Connect to Keyboard
                  </>
                )}
              </button>

              {status.message && (
                <div
                  className={`rounded-lg p-4 flex items-start gap-3 ${
                    status.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/30'
                      : status.type === 'success'
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-brand-blue/10 border border-brand-blue/30'
                  }`}
                >
                  {status.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : status.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : status.type === 'flashing' ? (
                    <Loader className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5 animate-spin" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      status.type === 'error'
                        ? 'text-red-400'
                        : status.type === 'success'
                        ? 'text-green-400'
                        : 'text-brand-blue'
                    }`}
                  >
                    {status.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-brand-beige" />
              <h2 className="text-2xl font-bold text-white">Step 3: Flash</h2>
            </div>

            <button
              onClick={flashFirmware}
              disabled={!device || !firmwareFile || status.type === 'flashing'}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status.type === 'flashing' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Flashing... {progress}%
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Flash Firmware
                </>
              )}
            </button>

            {status.type === 'flashing' && (
              <div className="mt-4">
                <div className="w-full bg-brand-brown/30 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {logs.length > 0 && (
            <div className="bg-brand-teal rounded-xl border border-brand-sage/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Flash Log</h3>
              <div className="bg-brand-brown/50 rounded-lg p-4 font-mono text-xs max-h-64 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`${
                      log.includes('ERROR') || log.includes('FATAL')
                        ? 'text-red-400'
                        : log.includes('WARNING')
                        ? 'text-yellow-400'
                        : log.includes('SUCCESS') || log.includes('successfully') || log.includes('completed')
                        ? 'text-green-400'
                        : 'text-brand-sage'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-brand-teal/40 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Troubleshooting</h3>
          <ul className="space-y-2 text-brand-sage text-sm">
            <li>• If the keyboard is not detected, make sure it's in bootloader mode</li>
            <li>• Try unplugging and replugging the keyboard while holding the reset button</li>
            <li>• Some keyboards require a specific key combination to enter bootloader mode</li>
            <li>• Check your keyboard's documentation for the correct bootloader method</li>
            <li>• Make sure no other applications are using the USB device</li>
          </ul>
        </div>
      </div>
    </div>
  );
}