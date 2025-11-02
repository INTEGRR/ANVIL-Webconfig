export const constants = {
  appIdleState: 0,
  appDetachState: 1,
  dfuIdleState: 2,
  dfuDownloadSyncState: 3,
  dfuDownBusyState: 4,
  dfuDownloadIdleState: 5,
  dfuManifestSyncState: 6,
  dfuManifestState: 7,
  dfuManifestWaitResetState: 8,
  dfuUploadIdleState: 9,
  dfuErrorState: 10,

  STATUS_OK: 0x0,

  dfuCommandsOffset: 0,
  dfuCommandsSetAddressPointer: 0x21,
  dfuCommandsErase: 0x41
};

export interface DfuInterfaceDescriptor {
  bLength: number;
  bDescriptorType: number;
  bmAttributes: number;
  wDetachTimeOut: number;
  wTransferSize: number;
  bcdDFUVersion: number;
}

export interface MemorySegment {
  start: number;
  end: number;
  readable: boolean;
  erasable: boolean;
  writable: boolean;
}

export interface DfuseMemoryDescriptor {
  name: string;
  segments: MemorySegment[];
}

interface DfuProperties {
  CanDnload?: boolean;
  CanUpload?: boolean;
  ManifestationTolerant?: boolean;
  WillDetach?: boolean;
  TransferSize?: number;
  DetachTimeOut?: number;
  DFUVersion?: number;
}

export class Device {
  device_: USBDevice;
  settings: USBAlternateInterface;
  intfNumber: number;
  memoryInfo: DfuseMemoryDescriptor | null = null;
  startAddress: number = NaN;
  properties: DfuProperties = {};

  logDebug: (msg: string) => void;
  logInfo: (msg: string) => void;
  logWarning: (msg: string) => void;
  logError: (msg: string) => void;
  logProgress: (done: number, total: number) => void;

  constructor(device: USBDevice, settings: USBAlternateInterface) {
    this.device_ = device;
    this.settings = settings;
    this.intfNumber = settings.interfaceNumber;

    this.logDebug = console.debug;
    this.logInfo = console.info;
    this.logWarning = console.warn;
    this.logError = console.error;
    this.logProgress = (_done: number, _total: number) => {};
  }

  async open(): Promise<void> {
    await this.device_.open();
    const confValue = this.settings.alternate.interfaceProtocol;

    if (this.device_.configuration === null || this.device_.configuration.configurationValue !== confValue) {
      await this.device_.selectConfiguration(confValue);
    }

    await this.device_.claimInterface(this.intfNumber);
    await this.device_.selectAlternateInterface(this.intfNumber, this.settings.alternateSetting);
  }

  async close(): Promise<void> {
    try {
      await this.device_.releaseInterface(this.intfNumber);
      await this.device_.close();
    } catch (error) {
      this.logError(`Error closing device: ${error}`);
    }
  }

  async readStringDescriptor(index: number, langID = 0): Promise<string | undefined> {
    const GET_DESCRIPTOR = 0x06;
    const DT_STRING = 0x03;
    const wValue = (DT_STRING << 8) | index;

    const request_setup: USBControlTransferParameters = {
      requestType: 'standard',
      recipient: 'device',
      request: GET_DESCRIPTOR,
      value: wValue,
      index: langID
    };

    const result = await this.device_.controlTransferIn(request_setup, 255);

    if (result.status === 'ok' && result.data) {
      const len = result.data.getUint8(0);
      const type = result.data.getUint8(1);

      if (type === DT_STRING) {
        const decoder = new TextDecoder('utf-16le');
        return decoder.decode(result.data.buffer.slice(2, len));
      }
    }

    return undefined;
  }

  async readInterfaceNames(): Promise<void> {
    const DT_INTERFACE = 4;

    if (!this.device_.configuration) return;

    const configDesc = this.device_.configuration;
    let inIntfDescriptor = false;

    for (const iface of configDesc.interfaces) {
      if (iface.interfaceNumber === this.intfNumber) {
        for (const alt of iface.alternates) {
          if (alt.alternateSetting === this.settings.alternateSetting) {
            inIntfDescriptor = true;

            const iInterfaceIdx = alt.interfaceSubclass;
            if (iInterfaceIdx > 0) {
              const name = await this.readStringDescriptor(iInterfaceIdx);
              if (name) {
                this.memoryInfo = this.parseDfuseMemoryDescriptor(name);
              }
            }
            break;
          }
        }
      }
      if (inIntfDescriptor) break;
    }
  }

  parseDfuseMemoryDescriptor(desc: string): DfuseMemoryDescriptor | null {
    const nameEndIndex = desc.indexOf('/');
    if (nameEndIndex === -1) return null;

    const name = desc.substring(0, nameEndIndex).trim();
    const segmentString = desc.substring(nameEndIndex);

    const segments: MemorySegment[] = [];
    const segmentRegex = /\/\s*0x([0-9a-fA-F]{8})\s*\/\s*(\d+)\s*\*\s*(\d+)\s*([a-zA-Z])?/g;

    let match;
    while ((match = segmentRegex.exec(segmentString)) !== null) {
      const startAddr = parseInt(match[1], 16);
      const numPages = parseInt(match[2], 10);
      const pageSize = parseInt(match[3], 10);
      const flags = match[4] || '';

      const segment: MemorySegment = {
        start: startAddr,
        end: startAddr + numPages * pageSize,
        readable: flags.toLowerCase().includes('r'),
        erasable: flags.toLowerCase().includes('e'),
        writable: flags.toLowerCase().includes('w')
      };

      segments.push(segment);
    }

    return { name, segments };
  }

  async requestOut(bRequest: number, data?: BufferSource, wValue = 0): Promise<number> {
    return this.device_.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.intfNumber
    }, data);
  }

  async requestIn(bRequest: number, wLength: number, wValue = 0): Promise<DataView> {
    const result = await this.device_.controlTransferIn({
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.intfNumber
    }, wLength);

    if (result.status === 'ok' && result.data) {
      return result.data;
    }

    throw new Error(`Control transfer failed: ${result.status}`);
  }

  async detach(): Promise<number> {
    return this.requestOut(0, undefined, 1000);
  }

  async waitDisconnected(timeout: number): Promise<void> {
    let device = this;
    let start = Date.now();

    return new Promise((resolve, reject) => {
      const checkDisconnect = setInterval(() => {
        if (!navigator.usb.getDevices().then(devices => devices.includes(device.device_))) {
          clearInterval(checkDisconnect);
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(checkDisconnect);
          reject(new Error('Disconnect timeout'));
        }
      }, 100);
    });
  }

  async download(data: ArrayBuffer, blockNum: number): Promise<void> {
    const wValue = blockNum;
    await this.requestOut(1, data, wValue);
  }

  async upload(length: number, blockNum: number): Promise<DataView> {
    const wValue = blockNum;
    return await this.requestIn(2, length, wValue);
  }

  async clearStatus(): Promise<void> {
    await this.requestOut(4);
  }

  async getStatus(): Promise<{ status: number; pollTimeout: number; state: number }> {
    const data = await this.requestIn(3, 6);

    return {
      status: data.getUint8(0),
      pollTimeout: data.getUint8(1) | (data.getUint8(2) << 8) | (data.getUint8(3) << 16),
      state: data.getUint8(4)
    };
  }

  async getState(): Promise<number> {
    const data = await this.requestIn(5, 1);
    return data.getUint8(0);
  }

  async abort(): Promise<void> {
    await this.requestOut(6);
  }

  async abortToIdle(): Promise<void> {
    await this.abort();
    let state = await this.getState();

    if (state === constants.dfuErrorState) {
      await this.clearStatus();
      state = await this.getState();
    }

    if (state !== constants.dfuIdleState && state !== constants.appIdleState) {
      throw new Error(`Failed to return to idle state after abort (state ${state})`);
    }
  }

  async do_download(xfer_size: number, data: ArrayBuffer, manifestationTolerant: boolean): Promise<void> {
    let bytes_sent = 0;
    let expected_size = data.byteLength;
    let blockNum = 0;

    this.logInfo(`Downloading data (${expected_size} bytes)...`);

    while (bytes_sent < expected_size) {
      const chunk_size = Math.min(xfer_size, expected_size - bytes_sent);
      const chunk = data.slice(bytes_sent, bytes_sent + chunk_size);

      await this.download(chunk, blockNum);
      blockNum++;

      let status = await this.poll_until_idle(constants.dfuDownloadIdleState);

      if (status.status !== constants.STATUS_OK) {
        throw new Error(`DFU error during download: state ${status.state}, status ${status.status}`);
      }

      bytes_sent += chunk_size;
      this.logProgress(bytes_sent, expected_size);
    }

    this.logInfo('Download complete, sending zero-length packet...');
    await this.download(new ArrayBuffer(0), blockNum);

    try {
      await this.poll_until(state =>
        state === constants.dfuIdleState ||
        state === constants.dfuManifestState ||
        state === constants.dfuManifestWaitResetState
      );
    } catch (error) {
      if (manifestationTolerant) {
        this.logInfo('Device disconnected during manifestation (expected)');
      } else {
        throw error;
      }
    }

    this.logInfo('Download completed successfully');
  }

  async poll_until(predicate: (state: number) => boolean): Promise<{ status: number; state: number }> {
    let status = await this.getStatus();

    while (!predicate(status.state)) {
      if (status.pollTimeout > 0) {
        await new Promise(resolve => setTimeout(resolve, status.pollTimeout));
      }
      status = await this.getStatus();
    }

    return status;
  }

  async poll_until_idle(idle_state: number): Promise<{ status: number; state: number }> {
    return this.poll_until(state => state === idle_state);
  }

  async do_upload(xfer_size: number, max_size = Infinity): Promise<ArrayBuffer> {
    let blocks: ArrayBuffer[] = [];
    let bytes_read = 0;
    let blockNum = 0;

    this.logInfo('Uploading firmware...');

    let result;

    do {
      const chunk_size = Math.min(xfer_size, max_size - bytes_read);
      result = await this.upload(chunk_size, blockNum);

      this.logDebug(`Read ${result.byteLength} bytes in block ${blockNum}`);

      if (result.byteLength > 0) {
        blocks.push(result.buffer);
        bytes_read += result.byteLength;
        blockNum++;
      }

      if (bytes_read >= max_size) {
        break;
      }

      this.logProgress(bytes_read, max_size === Infinity ? bytes_read : max_size);

    } while (result.byteLength === xfer_size);

    this.logInfo(`Upload complete (${bytes_read} bytes)`);

    const combined = new Uint8Array(bytes_read);
    let offset = 0;

    for (const block of blocks) {
      combined.set(new Uint8Array(block), offset);
      offset += block.byteLength;
    }

    return combined.buffer;
  }
}

export async function findAllDfuInterfaces(): Promise<Device[]> {
  const filters = [
    { classCode: 0xFE, subclassCode: 0x01 }
  ];

  let devices: USBDevice[];

  try {
    devices = await navigator.usb.getDevices();
  } catch (error) {
    throw new Error(`Failed to get USB devices: ${error}`);
  }

  const dfuDevices: Device[] = [];

  for (const device of devices) {
    if (!device.configuration) continue;

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 0xFE && alt.interfaceSubclass === 0x01) {
          dfuDevices.push(new Device(device, alt));
        }
      }
    }
  }

  return dfuDevices;
}

export async function requestDevice(): Promise<Device | null> {
  const filters = [
    { classCode: 0xFE, subclassCode: 0x01 }
  ];

  let device: USBDevice;

  try {
    device = await navigator.usb.requestDevice({ filters });
  } catch (error) {
    return null;
  }

  if (!device.configuration) return null;

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      if (alt.interfaceClass === 0xFE && alt.interfaceSubclass === 0x01) {
        return new Device(device, alt);
      }
    }
  }

  return null;
}
