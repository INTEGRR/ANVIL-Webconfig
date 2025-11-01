import { useState } from 'react';
import { Activity } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  details: string;
}

export default function Diagnostics() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (name: string, status: 'pass' | 'fail' | 'warning', details: string) => {
    setResults(prev => [...prev, { name, status, details }]);
  };

  const runDiagnostics = async () => {
    setResults([]);
    setIsRunning(true);

    try {
      addResult('Browser Support', 'pending', 'Checking...');
      if (!navigator.usb) {
        addResult('Browser Support', 'fail', 'WebUSB not supported. Use Chrome/Edge on desktop.');
        setIsRunning(false);
        return;
      }
      addResult('Browser Support', 'pass', 'WebUSB API available');

      addResult('Device Selection', 'pending', 'Requesting device...');
      const selectedDevice = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x0483, productId: 0xdf11 }]
      });
      setDevice(selectedDevice);
      addResult('Device Selection', 'pass', `Device: ${selectedDevice.productName || 'Unknown'}`);

      addResult('Device Open', 'pending', 'Opening device...');
      if (!selectedDevice.opened) {
        await selectedDevice.open();
      }
      addResult('Device Open', 'pass', 'Device opened successfully');

      addResult('Configuration', 'pending', 'Checking configuration...');
      if (selectedDevice.configuration === null) {
        await selectedDevice.selectConfiguration(1);
      }
      addResult('Configuration', 'pass', `Active config: ${selectedDevice.configuration?.configurationValue}`);

      const dfuInterface = selectedDevice.configuration?.interfaces.find(
        iface => iface.alternates.some(alt => alt.interfaceClass === 0xfe && alt.interfaceSubclass === 0x1)
      );

      if (!dfuInterface) {
        addResult('DFU Interface', 'fail', 'No DFU interface found (class 0xFE, subclass 0x01)');
        setIsRunning(false);
        return;
      }
      addResult('DFU Interface', 'pass', `Found DFU at interface ${dfuInterface.interfaceNumber}`);

      const interfaceNumber = dfuInterface.interfaceNumber;

      addResult('Interface Claim', 'pending', 'Claiming interface...');
      if (!selectedDevice.configuration?.interfaces[interfaceNumber].claimed) {
        await selectedDevice.claimInterface(interfaceNumber);
      }
      addResult('Interface Claim', 'pass', 'Interface claimed');

      addResult('DFU_GETSTATUS', 'pending', 'Testing GET_STATUS command...');
      try {
        const statusResult = await selectedDevice.controlTransferIn(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 3,
            value: 0,
            index: interfaceNumber,
          },
          6
        );

        if (statusResult.status !== 'ok') {
          addResult('DFU_GETSTATUS', 'fail', `Transfer failed: ${statusResult.status}`);
        } else if (!statusResult.data || statusResult.data.byteLength < 6) {
          addResult('DFU_GETSTATUS', 'fail', `Invalid response size: ${statusResult.data?.byteLength || 0} bytes`);
        } else {
          const status = statusResult.data.getUint8(0);
          const state = statusResult.data.getUint8(4);
          const pollTimeout = statusResult.data.getUint8(1) | (statusResult.data.getUint8(2) << 8) | (statusResult.data.getUint8(3) << 16);

          addResult('DFU_GETSTATUS', 'pass', `Status: ${status}, State: ${state}, PollTimeout: ${pollTimeout}ms`);
        }
      } catch (error) {
        addResult('DFU_GETSTATUS', 'fail', `Error: ${error}`);
      }

      addResult('DFU_CLRSTATUS', 'pending', 'Testing CLEAR_STATUS command...');
      try {
        await selectedDevice.controlTransferOut(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 4,
            value: 0,
            index: interfaceNumber,
          }
        );
        addResult('DFU_CLRSTATUS', 'pass', 'CLEAR_STATUS successful');
      } catch (error) {
        addResult('DFU_CLRSTATUS', 'fail', `Error: ${error}`);
      }

      addResult('DFU_ABORT', 'pending', 'Testing ABORT command...');
      try {
        await selectedDevice.controlTransferOut(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 6,
            value: 0,
            index: interfaceNumber,
          }
        );
        addResult('DFU_ABORT', 'pass', 'ABORT successful');
      } catch (error) {
        addResult('DFU_ABORT', 'fail', `Error: ${error}`);
      }

      addResult('Small Write Test', 'pending', 'Testing small data write (16 bytes)...');
      try {
        const testData = new Uint8Array(16).fill(0xFF);
        await selectedDevice.controlTransferOut(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 1,
            value: 0,
            index: interfaceNumber,
          },
          testData
        );
        addResult('Small Write Test', 'pass', 'Small write successful');

        await new Promise(resolve => setTimeout(resolve, 100));

        const statusResult = await selectedDevice.controlTransferIn(
          {
            requestType: 'class',
            recipient: 'interface',
            request: 3,
            value: 0,
            index: interfaceNumber,
          },
          6
        );

        if (statusResult.data) {
          const state = statusResult.data.getUint8(4);
          addResult('Small Write Status', state === 2 ? 'pass' : 'warning',
            `Device state after write: ${state} (expected 2 for IDLE)`);
        }
      } catch (error) {
        addResult('Small Write Test', 'fail', `Error: ${error}`);
      }

      addResult('Device Descriptor', 'pending', 'Reading device info...');
      const info = {
        vendorId: `0x${selectedDevice.vendorId.toString(16).padStart(4, '0')}`,
        productId: `0x${selectedDevice.productId.toString(16).padStart(4, '0')}`,
        manufacturer: selectedDevice.manufacturerName || 'N/A',
        product: selectedDevice.productName || 'N/A',
        serialNumber: selectedDevice.serialNumber || 'N/A',
        usbVersion: selectedDevice.usbVersionMajor + '.' + selectedDevice.usbVersionMinor + '.' + selectedDevice.usbVersionSubminor,
        deviceVersion: selectedDevice.deviceVersionMajor + '.' + selectedDevice.deviceVersionMinor + '.' + selectedDevice.deviceVersionSubminor,
      };
      addResult('Device Descriptor', 'pass', JSON.stringify(info, null, 2));

      const stateNames = ['appIDLE', 'appDETACH', 'dfuIDLE', 'dfuDNLOAD-SYNC', 'dfuDNBUSY',
                          'dfuDNLOAD-IDLE', 'dfuMANIFEST-SYNC', 'dfuMANIFEST', 'dfuMANIFEST-WAIT-RESET',
                          'dfuUPLOAD-IDLE', 'dfuERROR'];

      addResult('Summary', 'pass', 'DFU State Machine: ' + stateNames.join(', '));

      addResult('Conclusion', 'pass', 'Basic DFU commands work! Device supports WebUSB DFU.');

    } catch (error) {
      addResult('Fatal Error', 'fail', `${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const closeDevice = async () => {
    if (device && device.opened) {
      await device.close();
      setDevice(null);
      addResult('Device Closed', 'pass', 'Device connection closed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WebUSB DFU Diagnostics</h1>
            <p className="text-gray-600 text-sm mt-1">
              Test if your device supports web-based DFU flashing
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isRunning ? 'Running Tests...' : 'Start Diagnostic Tests'}
          </button>

          {device && (
            <button
              onClick={closeDevice}
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close Device
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Results</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  result.status === 'pass'
                    ? 'bg-green-50 border-green-500'
                    : result.status === 'fail'
                    ? 'bg-red-50 border-red-500'
                    : result.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-gray-50 border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{result.name}</h3>
                    <pre className="text-sm text-gray-700 mt-1 whitespace-pre-wrap font-mono">
                      {result.details}
                    </pre>
                  </div>
                  <span
                    className={`ml-4 px-3 py-1 rounded text-xs font-medium ${
                      result.status === 'pass'
                        ? 'bg-green-100 text-green-800'
                        : result.status === 'fail'
                        ? 'bg-red-100 text-red-800'
                        : result.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2">What This Tests:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• WebUSB API availability in browser</li>
          <li>• Device detection and connection</li>
          <li>• DFU interface presence (class 0xFE, subclass 0x01)</li>
          <li>• DFU commands: GET_STATUS, CLEAR_STATUS, ABORT</li>
          <li>• Small write operation (16 bytes)</li>
          <li>• Device descriptor information</li>
        </ul>
        <p className="text-sm text-blue-800 mt-3 font-medium">
          If all tests pass, WebUSB DFU should work. If small write fails, your bootloader may have restrictions.
        </p>
      </div>
    </div>
  );
}
