import React, { useState } from 'react';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

interface LabelPrinterProps {
  productName: string;
  productCode: string;
  price: number;
}

export const LabelPrinter: React.FC<LabelPrinterProps> = ({ productName, productCode, price }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printLabel = async () => {
    setIsPrinting(true);
    setError(null);

    try {
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON, // You might need to experiment with different types
        interface: 'printer:Brother QL-800',
        characterSet: CharacterSet.PC437_USA,
        removeSpecialCharacters: false,
        lineCharacter: "=",
      });

      await printer.isPrinterConnected();

      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println(productName);
      printer.bold(false);
      printer.setTextNormal();
      printer.println(`Code: ${productCode}`);
      printer.println(`Price: $${price.toFixed(2)}`);
      printer.cut();

      const result = await printer.execute();
      console.log("Print result:", result);
    } catch (err) {
      console.error("Printing failed", err);
      setError("Failed to print label. Please check printer connection.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div>
      <button 
        onClick={printLabel} 
        disabled={isPrinting}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isPrinting ? 'Printing...' : 'Print Label'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};