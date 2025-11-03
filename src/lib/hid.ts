export interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

type DataHandler = (data: Uint8Array) => void;

export class HIDConnection {
  private device: HIDDevice | null = null;
  private reportId: number = 0;
  private onDataHandler: DataHandler | null = null;

  onData(handler: DataHandler): void {
    this.onDataHandler = handler;
  }

  isConnected(): boolean {
    return !!this.device && this.device.opened === true;
  }

  getDeviceInfo(): { productName: string; vendorId: number; productId: number; opened: boolean } | null {
    if (!this.device) return null;
    return {
      productName: this.device.productName || 'Unknown',
      vendorId: this.device.vendorId,
      productId: this.device.productId,
      opened: this.device.opened
    };
  }

  async requestDevice(filters?: HIDDeviceFilter[]): Promise<boolean> {
    try {
      if (!('hid' in navigator)) {
        throw new Error('WebHID not supported');
      }

      let devices = await (navigator as any).hid.getDevices();

      if (filters && filters.length > 0) {
        devices = devices.filter((d: HIDDevice) =>
          filters.some(f =>
            (f.vendorId == null || d.vendorId === f.vendorId) &&
            (f.productId == null || d.productId === f.productId) &&
            (f.usagePage == null || d.collections.some(c => c.usagePage === f.usagePage))
          )
        );
      }

      if (devices.length === 0) {
        const requested = await (navigator as any).hid.requestDevice({ filters: filters || [] });
        if (requested.length === 0) return false;
        this.device = requested[0];
      } else {
        this.device = devices[0];
      }

      this.bindDeviceEvents();
      return !!this.device;
    } catch (error) {
      console.error('Failed to request device:', error);
      return false;
    }
  }

  private bindDeviceEvents(): void {
    (navigator as any).hid.onconnect = (e: any) => {
      if (!this.device && e.device) {
        this.device = e.device;
      }
    };
    (navigator as any).hid.ondisconnect = (e: any) => {
      if (this.device && e.device === this.device) {
        this.device = null;
      }
    };
  }

  async connect(): Promise<boolean> {
    if (!this.device) return false;

    try {
      if (!this.device.opened) {
        await this.device.open();
      }

      this.reportId = 0;
      const coll = this.device.collections.find(() => true);
      if (coll && coll.outputReports && coll.outputReports.length > 0) {
        const rid = coll.outputReports[0].reportId;
        if (typeof rid === 'number') {
          this.reportId = rid;
        }
      }

      this.device.addEventListener('inputreport', (e: any) => {
        const view = new Uint8Array(e.data.buffer);
        if (this.onDataHandler) {
          this.onDataHandler(view);
        }
      });

      return this.device.opened === true;
    } catch (error) {
      console.error('Failed to open device:', error);
      return false;
    }
  }

  async ensureConnected(): Promise<void> {
    if (!this.device) {
      throw new Error('No device selected');
    }
    if (!this.device.opened) {
      await this.device.open();
      if (this.reportId == null) {
        this.reportId = 0;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close();
    }
    this.device = null;
    this.reportId = 0;
    this.onDataHandler = null;
  }

  async sendReport(reportId: number | null, payload: Uint8Array): Promise<void> {
    if (!this.device) {
      throw new Error('Device not selected');
    }
    if (!this.device.opened) {
      await this.device.open();
    }
    const rid = reportId ?? this.reportId ?? 0;
    await this.device.sendReport(rid, payload);
  }
}
