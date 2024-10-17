"use client"

import React, { useState } from 'react';
import { Button } from "app/components/ui/button"

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

export default function BarcodeTest() {
  const [printStatus, setPrintStatus] = useState<string>('');

  const handlePrintBarcode = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('print-barcode', {
        barcode: '123456789012',
        productInfo: 'Test Product XYZ 001'
      });
      
      console.log('Print result:', result);
      setPrintStatus(result.message || 'Barcode printed successfully');
    } catch (error) {
      console.error('Error printing barcode:', error);
      setPrintStatus(`Failed to print barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Barcode Printing Test</h1>
      <Button onClick={handlePrintBarcode}>Print Test Barcode</Button>
      {printStatus && <p className="mt-4">{printStatus}</p>}
    </div>
  );
}