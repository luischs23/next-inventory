import { ThermalPrinter as OriginalThermalPrinter, PrinterTypes } from 'node-thermal-printer';

declare module 'node-thermal-printer' {
  enum BarcodeType {
    UPC_A = 0,
    UPC_E = 1,
    EAN13 = 2,
    EAN8 = 3,
    CODE39 = 4,
    ITF = 5,
    NW7 = 6,
    CODE93 = 72,
    CODE128 = 73,
  }

  interface ThermalPrinterExtension {
    printBarcode(
      data: string,
      type: BarcodeType,
      options: {
        width: number;
        height: number;
        hriPos: number;
        hriFont: number;
      }
    ): void;
  }

  interface ThermalPrinter extends Omit<OriginalThermalPrinter, 'printBarcode'>, ThermalPrinterExtension {}
}