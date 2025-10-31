import { useState, useRef } from 'react';
import { Upload, Usb, Download, AlertCircle, CheckCircle, Loader, Zap } from 'lucide-react';

interface FlashStatus {
  type: 'idle' | 'connecting' | 'flashing' | 'success' | 'error';
  message: string;
}

const DFU_COMMANDS = {
  DETACH: 0x00,
  DNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,
};

const PRESET_FIRMWARES = [
  {
    name: 'Per-Key EEPROM Save',
    filename: 'teleport_native_iso_per_Key_eeprom_save.bin',
    description: 'Firmware with per-key RGB EEPROM save functionality'
  },
  {
    name: 'Performance Mode',
    filename: 'teleport_native_iso_perfmode.bin',
    description: 'High-performance optimized firmware (recommended for first flash)'
  }
];

export default function Flash() {
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [status, setStatus] = useState<FlashStatus>({ type: 'idle', message: '' });
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const dfuGetStatus = async (device: USBDevice, interfaceNumber: number) => {
    const result = await device.controlTransferIn(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_COMMANDS.GETSTATUS,
        value: 0,
        index: interfaceNumber,
      },
      6
    );

    if (result.data && result.data.byteLength >= 6) {
      const status = result.data.getUint8(0);
      const pollTimeout = result.data.getUint8(1) | (result.data.getUint8(2) << 8) | (result.data.getUint8(3) << 16);
      const state = result.data.getUint8(4);
      return { status, pollTimeout, state };
    }
    throw new Error('Invalid DFU status response');
  };

  const dfuClearStatus = async (device: USBDevice, interfaceNumber: number) => {
    await device.controlTransferOut(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_COMMANDS.CLRSTATUS,
        value: 0,
        index: interfaceNumber,
      }
    );
  };

  const dfuDownload = async (device: USBDevice, interfaceNumber: number, blockNum: number, data: Uint8Array) => {
    await device.controlTransferOut(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_COMMANDS.DNLOAD,
        value: blockNum,
        index: interfaceNumber,
      },
      data
    );
  };

  const dfuSetAddress = async (device: USBDevice, interfaceNumber: number, address: number) => {
    const cmd = new Uint8Array(5);
    cmd[0] = 0x21;
    cmd[1] = address & 0xff;
    cmd[2] = (address >> 8) & 0xff;
    cmd[3] = (address >> 16) & 0xff;
    cmd[4] = (address >> 24) & 0xff;

    await dfuDownload(device, interfaceNumber, 0, cmd);
  };

  const dfuDetach = async (device: USBDevice, interfaceNumber: number) => {
    try {
      await device.controlTransferOut(
        {
          requestType: 'class',
          recipient: 'interface',
          request: DFU_COMMANDS.DETACH,
          value: 1000,
          index: interfaceNumber,
        }
      );
    } catch (e) {
      // Device may disconnect before response
    }
  };

  const pollUntilState = async (device: USBDevice, interfaceNumber: number, targetState: number, maxAttempts = 50) => {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await dfuGetStatus(device, interfaceNumber);

      if (status.state === targetState) {
        return status;
      }

      if (status.state === 10) {
        const statusNames = ['OK', 'errTARGET', 'errFILE', 'errWRITE', 'errERASE', 'errCHECK_ERASED',
                             'errPROG', 'errVERIFY', 'errADDRESS', 'errNOTDONE', 'errFIRMWARE',
                             'errVENDOR', 'errUSBR', 'errPOR', 'errUNKNOWN', 'errSTALLEDPKT'];
        throw new Error(`DFU Error: ${statusNames[status.status] || 'Unknown'}`);
      }

      if (status.state === 4) {
        const waitTime = status.pollTimeout > 0 ? status.pollTimeout : 100;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw new Error(`Timeout waiting for state ${targetState}`);
  };

  const flashFirmwareDfu = async (device: USBDevice, data: Uint8Array, interfaceNumber: number) => {
    try {
      addLog('Claiming DFU interface...');
      await device.claimInterface(interfaceNumber);

      addLog('Checking initial DFU status...');
      let status = await dfuGetStatus(device, interfaceNumber);
      addLog(`Initial state: ${status.state}, status: ${status.status}`);

      if (status.state === 10) {
        addLog('Clearing error state...');
        await dfuClearStatus(device, interfaceNumber);
        await new Promise(resolve => setTimeout(resolve, 100));
        status = await dfuGetStatus(device, interfaceNumber);
        addLog(`State after clear: ${status.state}`);
      }

      if (status.state !== 2) {
        addLog('Aborting previous operation...');
        await device.controlTransferOut({
          requestType: 'class',
          recipient: 'interface',
          request: DFU_COMMANDS.ABORT,
          value: 0,
          index: interfaceNumber,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        status = await dfuGetStatus(device, interfaceNumber);
        addLog(`State after abort: ${status.state}`);
      }

      addLog('Skipping mass erase (causes device disconnect on this bootloader)');
      addLog('STM32 bootloader will auto-erase sectors during write operation');

      const startAddress = 0x08000000;
      addLog(`Setting start address to 0x${startAddress.toString(16)}...`);
      await dfuSetAddress(device, interfaceNumber, startAddress);

      let pollAttempts = 0;
      while (pollAttempts < 50) {
        status = await dfuGetStatus(device, interfaceNumber);
        addLog(`SET_ADDRESS status poll ${pollAttempts + 1}: state=${status.state}, status=${status.status}, pollTimeout=${status.pollTimeout}ms`);

        if (status.state === 5) {
          addLog('Device in DFU_DNLOAD_IDLE - address set successfully!');
          break;
        }

        if (status.state === 4) {
          const waitTime = status.pollTimeout > 0 ? status.pollTimeout : 100;
          addLog(`Device in DFU_DNBUSY - waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (status.state === 2) {
          addLog('Device in DFU_IDLE - address command accepted');
          break;
        }

        pollAttempts++;
      }

      addLog(`SET_ADDRESS complete (final state: ${status.state})`);

      const transferSize = 2048;
      const totalBlocks = Math.ceil(data.length / transferSize);
      addLog(`Starting DFU download: ${totalBlocks} blocks of ${transferSize} bytes`);

      for (let blockNum = 0; blockNum < totalBlocks; blockNum++) {
        const start = blockNum * transferSize;
        const end = Math.min(start + transferSize, data.length);
        const chunk = data.slice(start, end);

        await dfuDownload(device, interfaceNumber, blockNum + 2, chunk);

        let pollAttempts = 0;
        while (pollAttempts < 100) {
          status = await dfuGetStatus(device, interfaceNumber);

          if (status.state === 5) {
            break;
          }

          if (status.state === 10) {
            const statusNames = ['OK', 'errTARGET', 'errFILE', 'errWRITE', 'errERASE', 'errCHECK_ERASED',
                                 'errPROG', 'errVERIFY', 'errADDRESS', 'errNOTDONE', 'errFIRMWARE',
                                 'errVENDOR', 'errUSBR', 'errPOR', 'errUNKNOWN', 'errSTALLEDPKT'];
            const statusName = statusNames[status.status] || `Unknown(${status.status})`;
            throw new Error(`DFU Error at block ${blockNum}: ${statusName}`);
          }

          if (status.state === 4) {
            const waitTime = status.pollTimeout > 0 ? status.pollTimeout : 50;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          pollAttempts++;
        }

        const currentProgress = Math.round(((blockNum + 1) / totalBlocks) * 100);
        setProgress(currentProgress);

        if (blockNum % 10 === 0 || blockNum === totalBlocks - 1) {
          addLog(`Block ${blockNum + 1}/${totalBlocks} transferred (${chunk.length} bytes, state: ${status.state})`);
        }
      }

      addLog('All blocks transferred successfully!');

      addLog('Sending zero-length DNLOAD to signal completion...');
      const finalBlockNum = totalBlocks + 2;
      await dfuDownload(device, interfaceNumber, finalBlockNum, new Uint8Array(0));
      addLog(`Zero-length DNLOAD sent with block number ${finalBlockNum}`);

      addLog('Polling device status for manifestation...');
      let manifestAttempts = 0;

      while (manifestAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const status = await dfuGetStatus(device, interfaceNumber);
          addLog(`Status poll ${manifestAttempts + 1}: state=${status.state}, status=${status.status}`);

          if (status.state === 7) {
            addLog('Device in MANIFEST state - firmware being written!');
          }

          manifestAttempts++;
        } catch (e: any) {
          addLog(`Status poll failed (normal if device disconnected): ${e.message}`);
          break;
        }
      }

      addLog('Attempting to send DETACH command...');
      try {
        await dfuDetach(device, interfaceNumber);
      } catch (error: any) {
        addLog(`DETACH command error (device may have already reset): ${error.message}`);
      }

      addLog('Firmware flash complete! Device should reboot automatically.');
      addLog('If device does not respond, press RESET button once.');
      addLog('DFU flash completed successfully!');

      setStatus({
        type: 'success',
        message: 'Firmware flashed successfully! Device will reboot.',
      });
      setProgress(100);
      setDevice(null);
    } catch (error: any) {
      addLog(`DFU ERROR: ${error.message}`);
      throw error;
    }
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

    setSelectedPreset('');
    setFirmwareFile(file);
    setStatus({
      type: 'idle',
      message: `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
    });
  };

  const handlePresetSelect = async (filename: string) => {
    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error('Failed to load firmware');

      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'application/octet-stream' });

      setSelectedPreset(filename);
      setFirmwareFile(file);
      setStatus({
        type: 'idle',
        message: `Preset selected: ${filename} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to load preset firmware. Please try uploading manually.',
      });
    }
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
          addLog(`Interface ${idx}: ${iface.interfaceNumber}, Endpoints: ${iface.alternate.endpoints.length}`);
        });
      }

      setDevice(selectedDevice);
      setStatus({
        type: 'success',
        message: `Connected to: ${selectedDevice.productName || 'Unknown Device'}`,
      });
      addLog('Ready to flash!');
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to connect to device.',
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

      if (device.configuration === null) {
        addLog('Selecting configuration 1...');
        await device.selectConfiguration(1);
      } else {
        addLog(`Using active configuration: ${device.configuration.configurationValue}`);
      }

      addLog('Detecting device protocol...');
      let selectedInterface: number | null = null;

      for (const iface of device.configuration!.interfaces) {
        addLog(`Checking Interface ${iface.interfaceNumber}...`);

        if (iface.alternates.length > 0) {
          const alternate = iface.alternates[0];

          if (alternate.interfaceClass === 0xFE && alternate.interfaceSubclass === 0x01) {
            addLog(`✓ Detected DFU interface (Class: 0x${alternate.interfaceClass.toString(16)}, Subclass: 0x${alternate.interfaceSubclass.toString(16)})`);
            selectedInterface = iface.interfaceNumber;
            break;
          }
        }
      }

      if (selectedInterface === null) {
        throw new Error('No DFU interface found. Make sure device is in bootloader mode (hold BOOT0 while connecting).');
      }

      addLog('Using DFU protocol (control transfers)');
      await flashFirmwareDfu(device, data, selectedInterface);
    } catch (error: any) {
      addLog(`FATAL ERROR: ${error.message}`);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to flash firmware.',
      });

      if (device) {
        try {
          addLog('Attempting to close device after error...');
          await device.close();
          addLog('Device closed');
        } catch (e: any) {
          addLog(`Error closing device: ${e.message}`);
        }
        setDevice(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Firmware Flasher
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Flash firmware directly to your keyboard via WebUSB. No additional software required.
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-200 mb-2">Bootloader Mode Required</h3>
              <div className="text-sm text-slate-300 space-y-2">
                <p className="font-medium">Enter DFU bootloader mode:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Disconnect USB cable</li>
                  <li>Press and HOLD the BOOT0 button</li>
                  <li>Connect USB while holding BOOT0</li>
                  <li>Release BOOT0 after 2 seconds</li>
                  <li>Device appears as "STM32 BOOTLOADER"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Step 1: Select Firmware</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
                <label className="block text-white font-medium mb-3">Preset Firmwares</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                >
                  <option value="">Choose a preset firmware...</option>
                  {PRESET_FIRMWARES.map((preset) => (
                    <option key={preset.filename} value={preset.filename}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                {selectedPreset && (
                  <p className="text-slate-400 text-sm mt-3">
                    {PRESET_FIRMWARES.find(p => p.filename === selectedPreset)?.description}
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-800/50 text-slate-400">OR</span>
                </div>
              </div>

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
                  className="w-full bg-slate-800/50 hover:bg-slate-800 text-white px-6 py-6 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500 transition-all flex flex-col items-center gap-3 group"
                >
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <span className="font-medium text-lg">Upload Custom Firmware</span>
                  <span className="text-sm text-slate-400">Supported: .bin, .hex, .uf2</span>
                </button>
              </div>

              {firmwareFile && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-white font-medium">{firmwareFile.name}</p>
                      <p className="text-slate-400 text-sm">
                        {(firmwareFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Usb className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Step 2: Connect Device</h2>
            </div>

            <button
              onClick={connectToDevice}
              disabled={status.type === 'connecting' || status.type === 'flashing'}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
                className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${
                  status.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : status.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
                }`}
              >
                {status.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                ) : status.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <Loader className="w-5 h-5 text-blue-400 flex-shrink-0 animate-spin" />
                )}
                <p className={`text-sm ${
                  status.type === 'error'
                    ? 'text-red-300'
                    : status.type === 'success'
                    ? 'text-green-300'
                    : 'text-blue-300'
                }`}>
                  {status.message}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Step 3: Flash</h2>
            </div>

            <button
              onClick={flashFirmware}
              disabled={!device || !firmwareFile || status.type === 'flashing'}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {status.type === 'flashing' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Flashing... {progress}%
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Flash Firmware
                </>
              )}
            </button>

            {status.type === 'flashing' && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {logs.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Flash Log
            </h3>
            <div className="bg-slate-900/80 rounded-xl p-4 font-mono text-xs max-h-96 overflow-y-auto border border-slate-700/50">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`py-1 ${
                    log.includes('ERROR') || log.includes('FATAL')
                      ? 'text-red-400'
                      : log.includes('WARNING')
                      ? 'text-yellow-400'
                      : log.includes('✓') || log.includes('success')
                      ? 'text-green-400'
                      : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
