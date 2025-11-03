export interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

export class HIDConnection {
  private device: HIDDevice | null = null;
  private onDataCallback: ((data: Uint8Array) => void) | null = null;

  async requestDevice(filters?: HIDDeviceFilter[]): Promise<boolean> {
    try {
      if (!('hid' in navigator)) {
        throw new Error('WebHID not supported in this browser');
      }

      const devices = await (navigator as any).hid.requestDevice({
        filters: filters && filters.length > 0 ? filters : undefined
      });

      console.log('Selected devices:', devices);

      if (devices.length === 0) {
        console.warn('No HID devices selected');
        return false;
      }

      this.device = devices[0];

      console.log('Device info:', {
        productName: this.device.productName,
        vendorId: this.device.vendorId.toString(16),
        productId: this.device.productId.toString(16),
        collections: this.device.collections
      });

      return true;
    } catch (error) {
      console.error('Failed to request HID device:', error);
      return false;
    }
  }

  async connect(): Promise<boolean> {
    if (!this.device) {
      return false;
    }

    try {
      if (!this.device.opened) {
        await this.device.open();
      }

      console.log('Device opened successfully');
      console.log('Collections:', this.device.collections);

      this.device.addEventListener('inputreport', (event: any) => {
        console.log('Received input report:', event.reportId, new Uint8Array(event.data.buffer));
        const data = new Uint8Array(event.data.buffer);
        if (this.onDataCallback) {
          this.onDataCallback(data);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to HID device:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close();
    }
    this.device = null;
    this.onDataCallback = null;
  }

  onData(callback: (data: Uint8Array) => void): void {
    this.onDataCallback = callback;
  }

  async sendReport(reportId: number, data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error('Device not connected');
    }

    await this.device.sendReport(reportId, data);
  }

  getDeviceInfo(): { productName: string; vendorId: number; productId: number } | null {
    if (!this.device) {
      return null;
    }

    return {
      productName: this.device.productName || 'Unknown',
      vendorId: this.device.vendorId,
      productId: this.device.productId
    };
  }

  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }
}
