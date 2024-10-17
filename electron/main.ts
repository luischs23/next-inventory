import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import { ThermalPrinter, PrinterTypes, CharacterSet, BarcodeType } from 'node-thermal-printer';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../.next/server/pages/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('print-barcode', async (event, { barcode, productInfo }) => {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:Brother QL-800',
      options: {
        timeout: 1000,
      },
      width: 63,
      characterSet: CharacterSet.PC437_USA,
      removeSpecialCharacters: false,
      lineCharacter: "=",
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error("Printer is not connected");
    }

    printer.setTypeFontB();
    printer.println("\x1B\x69\x7A\x3F\x21");
    printer.alignCenter();
    printer.setTextNormal();
    const infoLines = productInfo.split(' ');
    printer.println(infoLines[0] + ' ' + infoLines[1]);
    printer.println(infoLines[2] + ' ' + infoLines[3]);
    printer.printBarcode(barcode, BarcodeType.CODE128, {
      width: 2,
      height: 50,
      hriPos: 2, // 2 means below the barcode
      hriFont: 1
    });
    printer.cut();

    await printer.execute();
    return { success: true, message: "Barcode printed successfully" };
  } catch (error) {
    console.error("Printing failed", error);
    return { success: false, message: "Failed to print barcode" };
  }
});