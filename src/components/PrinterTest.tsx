"use client"

import React, { useState } from 'react';
import { Button } from "app/components/ui/button"
import { Input } from "app/components/ui/input"

export default function PrinterTest() {
  const [labelData, setLabelData] = useState({
    text1: "Nike Af1 Underground - Blanco/Negro",
    text2: "36",
    barcode: "231004001201100202"
  });

  const handleTestPrint = async () => {
    try {
      const response = await fetch('/api/printer-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(labelData),
      });

      if (!response.ok) {
        throw new Error('Failed to complete printer test');
      }

      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error testing printer:', error);
      alert('Error testing printer: ' + error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Printer Test</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            value={labelData.text1}
            onChange={(e) => setLabelData({ ...labelData, text1: e.target.value })}
            placeholder="Text 1"
          />
          <Input
            value={labelData.text2}
            onChange={(e) => setLabelData({ ...labelData, text2: e.target.value })}
            placeholder="Text 2"
          />
          <Input
            value={labelData.barcode}
            onChange={(e) => setLabelData({ ...labelData, barcode: e.target.value })}
            placeholder="Barcode"
          />
          <Button onClick={handleTestPrint}>Test Print</Button>
        </div>
      </div>
    </div>
  );
}