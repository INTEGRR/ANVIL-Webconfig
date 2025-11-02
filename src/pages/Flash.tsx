import { useState, useRef } from 'react';
import { Upload, Usb, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';

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

const DFU_STATUS = {
  OK: 0x00,
  errTARGET: 0x01,
  errFILE: 0x02,
  errWRITE: 0x03,
  errERASE: 0x04,
  errCHECK_ERASED: 0x05,
  errPROG: 0x06,
  errVERIFY: 0x07,
  errADDRESS: 0x08,
  errNOTDONE: 0x09,
  errFIRMWARE: 0x0a,
  errVENDOR: 0x0b,
  errUSBR: 0x0c,
  errPOR: 0x0d,
  errUNKNOWN: 0x0e,
  errSTALLEDPKT: 0x0f,
};

const PRESET_FIRMWARES = [
  {
    name: 'Per-Key EEPROM Save',
    filename: 'teleport_native_iso_per_Key_eeprom_save.bin',
    description: 'Firmware with per-key EEPROM save functionality'
  },
  {
    name: 'Performance Mode',
    filename: 'teleport_native_iso_perfmode.bin',
    description: 'High-performance optimized firmware'
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

    await device.controlTransferOut(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_COMMANDS.DNLOAD,
        value: 0,
        index: interfaceNumber,
      },
      cmd
    );
  };

  const dfuMassErase = async (device: USBDevice, interfaceNumber: number) => {
    const cmd = new Uint8Array(1);
    cmd[0] = 0x41;

    await device.controlTransferOut(
      {
        requestType: 'class',
        recipient: 'interface',
        request: DFU_COMMANDS.DNLOAD,
        value: 0,
        index: interfaceNumber,
      },
      cmd
    );
  };

  const waitForDfuIdle = async (device: USBDevice, interfaceNumber: number, allowBusy = false) => {
    let attempts = 0;
    while (attempts < 100) {
      const status = await dfuGetStatus(device, interfaceNumber);

      if (status.state === 2) {
        return status;
      }

      if (status.state === 5) {
        if (allowBusy) {
          return status;
        }
        if (status.pollTimeout > 0) {
          await new Promise(resolve => setTimeout(resolve, status.pollTimeout));
        }
      } else if (status.state === 10) {
        const statusNames = ['OK', 'errTARGET', 'errFILE', 'errWRITE', 'errERASE', 'errCHECK_ERASED',
                             'errPROG', 'errVERIFY', 'errADDRESS', 'errNOTDONE', 'errFIRMWARE',
                             'errVENDOR', 'errUSBR', 'errPOR', 'errUNKNOWN', 'errSTALLEDPKT'];
        const statusName = statusNames[status.status] || `Unknown(${status.status})`;
        throw new Error(`DFU Error: ${statusName} (state: ${status.state}, status: ${status.status})`);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      attempts++;
    }
    throw new Error('Timeout waiting for DFU idle state');
  };

  const pollUntilIdle = async (device: USBDevice, interfaceNumber: number, idleState: number) => {
    let status = await dfuGetStatus(device, interfaceNumber);

    while (status.state !== idleState && status.state !== 10) {
      if (status.pollTimeout > 0) {
        await new Promise(resolve => setTimeout(resolve, status.pollTimeout));
      }
      status = await dfuGetStatus(device, interfaceNumber);
    }

    return status;
  };

  const flashFirmwareDfu = async (device: USBDevice, data: Uint8Array, settings: any) => {
    try {
      const interfaceNumber = settings.interface.interfaceNumber;
      const alternateSetting = settings.alternate.alternateSetting;

      addLog(`Opening DFU device...`);
      addLog(`Interface: ${interfaceNumber}, Alternate: ${alternateSetting}`);

      const confValue = settings.configuration.configurationValue;
      if (device.configuration === null || device.configuration.configurationValue !== confValue) {
        addLog(`Selecting configuration ${confValue}...`);
        await device.selectConfiguration(confValue);
      }

      addLog(`Claiming interface ${interfaceNumber}...`);
      await device.claimInterface(interfaceNumber);
      addLog('Interface claimed');

      if (device.configuration!.interfaces[interfaceNumber].alternates.length > 1 ||
          device.configuration!.interfaces[interfaceNumber].alternate?.alternateSetting !== alternateSetting) {
        addLog(`Selecting alternate setting ${alternateSetting}...`);
        try {
          await device.selectAlternateInterface(interfaceNumber, alternateSetting);
          addLog('Alternate setting selected');
        } catch (error: any) {
          addLog(`Warning: ${error.message}`);
        }
      }

      addLog('Checking DFU status...');
      let status = await dfuGetStatus(device, interfaceNumber);
      addLog(`Initial state: ${status.state}, status: ${status.status}`);

      if (status.state === 10) {
        addLog('Clearing error state...');
        await dfuClearStatus(device, interfaceNumber);
        status = await dfuGetStatus(device, interfaceNumber);
        addLog(`State after clear: ${status.state}`);
      }

      if (status.state !== 2) {
        addLog('Aborting to return to idle...');
        await device.controlTransferOut({
          requestType: 'class',
          recipient: 'interface',
          request: DFU_COMMANDS.ABORT,
          value: 0,
          index: interfaceNumber,
        });
        status = await dfuGetStatus(device, interfaceNumber);
        if (status.state === 10) {
          await dfuClearStatus(device, interfaceNumber);
          status = await dfuGetStatus(device, interfaceNumber);
        }
        if (status.state !== 2) {
          throw new Error('Failed to return to idle state');
        }
      }

      const transferSize = settings.alternate.wTransferSize || 2048;
      addLog(`Transfer size: ${transferSize} bytes`);

      const totalBytes = data.length;
      let bytesSent = 0;
      let transaction = 0;

      addLog(`Starting DFU download: ${totalBytes} bytes`);
      setStatus({ type: 'flashing', message: 'Flashing firmware via DFU...' });

      while (bytesSent < totalBytes) {
        const bytesLeft = totalBytes - bytesSent;
        const chunkSize = Math.min(bytesLeft, transferSize);
        const chunk = data.slice(bytesSent, bytesSent + chunkSize);

        await dfuDownload(device, interfaceNumber, transaction++, chunk);

        status = await pollUntilIdle(device, interfaceNumber, 5);

        if (status.status !== DFU_STATUS.OK) {
          throw new Error(`DFU download failed at byte ${bytesSent}: status=${status.status}, state=${status.state}`);
        }

        bytesSent += chunkSize;

        const currentProgress = Math.round((bytesSent / totalBytes) * 100);
        setProgress(currentProgress);
        setStatus({
          type: 'flashing',
          message: `Flashing: ${currentProgress}%`,
        });

        if (transaction % 10 === 0 || bytesSent === totalBytes) {
          addLog(`Sent ${bytesSent}/${totalBytes} bytes (transaction ${transaction})`);
        }
      }

      addLog('Sending empty block to complete transfer...');
      await dfuDownload(device, interfaceNumber, transaction++, new Uint8Array(0));
      addLog('Manifesting new firmware...');

      try {
        status = await pollUntilIdle(device, interfaceNumber, 2);
        if (status.status !== DFU_STATUS.OK) {
          addLog(`Warning: Manifest status=${status.status}, state=${status.state}`);
        }
      } catch (error: any) {
        if (error.message.includes('Device unavailable') || error.message.includes('disconnected')) {
          addLog('Device disconnected during manifestation (expected behavior)');
        } else {
          addLog(`Warning during manifestation: ${error.message}`);
        }
      }

      addLog('Attempting device reset...');
      try {
        await device.reset();
      } catch (error: any) {
        if (error.message.includes('Unable to reset') || error.message.includes('unavailable') || error.message.includes('disconnected')) {
          addLog('Device reset handled (device may have already disconnected)');
        } else {
          throw error;
        }
      }

      addLog(`Releasing interface ${interfaceNumber}...`);
      try {
        await device.releaseInterface(interfaceNumber);
      } catch (e: any) {
        addLog(`Note: ${e.message}`);
      }

      addLog('Closing device...');
      try {
        await device.close();
      } catch (e: any) {
        addLog(`Note: ${e.message}`);
      }

      setStatus({
        type: 'success',
        message: 'Firmware flashed successfully! Your keyboard will reboot shortly.',
      });
      setProgress(100);
      addLog('DFU flash completed successfully!');
      setDevice(null);
    } catch (error: any) {
      console.error('DFU flash error:', error);
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

      addLog('Detecting DFU interfaces...');
      const dfuInterfaces = [];

      for (const conf of [device.configuration!]) {
        for (const iface of conf.interfaces) {
          for (const alt of iface.alternates) {
            addLog(`Checking Interface ${iface.interfaceNumber}, Alternate ${alt.alternateSetting}`);
            addLog(`  Class: 0x${alt.interfaceClass.toString(16)}, Subclass: 0x${alt.interfaceSubclass.toString(16)}, Protocol: 0x${alt.interfaceProtocol.toString(16)}`);

            if (alt.interfaceClass === 0xFE && alt.interfaceSubclass === 0x01 &&
                (alt.interfaceProtocol === 0x01 || alt.interfaceProtocol === 0x02)) {

              let transferSize = 2048;
              const dfuDescriptor = alt as any;
              if (dfuDescriptor.wTransferSize) {
                transferSize = dfuDescriptor.wTransferSize;
              }

              const settings = {
                configuration: conf,
                interface: iface,
                alternate: { ...alt, wTransferSize: transferSize },
                name: alt.interfaceName || `@Internal Flash /0x08000000`
              };

              dfuInterfaces.push(settings);
              addLog(`  ✓ Found DFU interface: ${settings.name}`);
            } else if (alt.interfaceClass === 0x03) {
              addLog(`  ⚠ WARNING: HID interface (normal firmware mode, not bootloader!)`);
            }
          }
        }
      }

      if (dfuInterfaces.length === 0) {
        addLog('ERROR: No DFU interfaces found!');
        addLog('Device is not in DFU bootloader mode.');
        addLog('Please disconnect, press BOOT0, and reconnect.');
        throw new Error('No DFU interfaces found. Device must be in DFU bootloader mode.');
      }

      addLog(`Found ${dfuInterfaces.length} DFU interface(s)`);
      dfuInterfaces.forEach((settings, idx) => {
        addLog(`  ${idx}: ${settings.name}`);
      });

      let selectedSettings = dfuInterfaces[0];
      if (dfuInterfaces.length > 1) {
        addLog('Multiple DFU interfaces available.');
        addLog('Selecting first interface (alt=0, @Internal Flash)');
        selectedSettings = dfuInterfaces.find((s: any) =>
          s.alternate.alternateSetting === 0 &&
          (s.name.includes('Internal Flash') || s.name.includes('0x08000000'))
        ) || dfuInterfaces[0];
      }

      addLog(`Selected: ${selectedSettings.name}`);
      addLog('Using DFU protocol');
      await flashFirmwareDfu(device, data, selectedSettings);
      return;

      addLog(`Using Interface ${selectedInterface}, OUT endpoint: ${outEndpoint}`);

      addLog(`Claiming interface ${selectedInterface}...`);
      try {
        await device.claimInterface(selectedInterface);
        addLog('Interface claimed successfully');

        if (selectedAlternate !== null && selectedAlternate !== 0) {
          addLog(`Selecting alternate setting ${selectedAlternate}...`);
          await device.selectAlternateInterface(selectedInterface, selectedAlternate);
          addLog('Alternate setting selected');
        }
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
      addLog(`Releasing interface ${selectedInterface}...`);
      await device.releaseInterface(selectedInterface);
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

        <div className="bg-amber-500/20 border-l-4 border-amber-500 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-200 mb-2">Critical: STM32 Bootloader Requirements</p>
              <div className="text-brand-sage space-y-2">
                <p className="font-medium text-white">Your keyboard MUST be in DFU bootloader mode:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong className="text-white">How to enter DFU mode:</strong></li>
                  <li className="ml-4">1. Disconnect USB cable</li>
                  <li className="ml-4">2. Press and HOLD the BOOT0 button (or BOOT button)</li>
                  <li className="ml-4">3. While holding BOOT0, connect USB cable</li>
                  <li className="ml-4">4. Release BOOT0 after 2 seconds</li>
                  <li className="ml-4">5. Device should appear as "STM32 BOOTLOADER"</li>
                </ul>
                <p className="text-amber-200 font-medium mt-3">⚠️ Normal firmware mode (with HID/RAW) CANNOT flash firmware!</p>
                <p className="text-xs mt-2">If you see "Interface Class: 0x03" in logs, you're in normal mode, not bootloader.</p>
              </div>
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
              <div className="bg-brand-brown/30 rounded-lg p-4">
                <label className="block text-white font-medium mb-2">Preset Firmwares</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige focus:outline-none"
                >
                  <option value="">Select a preset firmware...</option>
                  {PRESET_FIRMWARES.map((preset) => (
                    <option key={preset.filename} value={preset.filename}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                {selectedPreset && (
                  <p className="text-brand-sage text-sm mt-2">
                    {PRESET_FIRMWARES.find(p => p.filename === selectedPreset)?.description}
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-sage/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-brand-teal text-brand-sage">OR</span>
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
                  className="w-full bg-brand-teal/60 hover:bg-brand-teal/80 text-white px-6 py-4 rounded-lg border-2 border-dashed border-brand-sage/30 hover:border-brand-beige/50 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-brand-beige" />
                  <span className="font-medium">Upload custom firmware</span>
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
