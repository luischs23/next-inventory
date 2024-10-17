"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const node_thermal_printer_1 = require("node-thermal-printer");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 900,
        height: 680,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    mainWindow.loadURL(electron_is_dev_1.default
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../.next/server/pages/index.html')}`);
    if (electron_is_dev_1.default) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.ipcMain.handle('print-barcode', async (event, { barcode, productInfo }) => {
    try {
        const printer = new node_thermal_printer_1.ThermalPrinter({
            type: node_thermal_printer_1.PrinterTypes.EPSON,
            interface: 'printer:Brother QL-800',
            options: {
                timeout: 1000,
            },
            width: 63,
            characterSet: node_thermal_printer_1.CharacterSet.PC437_USA,
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
        printer.printBarcode(barcode, node_thermal_printer_1.BarcodeType.CODE128, {
            width: 2,
            height: 50,
            hriPos: 2, // 2 means below the barcode
            hriFont: 1
        });
        printer.cut();
        await printer.execute();
        return { success: true, message: "Barcode printed successfully" };
    }
    catch (error) {
        console.error("Printing failed", error);
        return { success: false, message: "Failed to print barcode" };
    }
});
