import { NextResponse } from 'next/server'
import { printLabel } from 'app/lib/brotherPrinter'

export async function POST() {
  try {
    console.log('Received print test request');
    // Data to be printed on the label
    const labelData = {
      text1: "Nike Af1 Underground - Blanco/Negro",
      text2: "44",
      barcode: "231004001201100202"
    };

    console.log('Calling printLabel function with data:', labelData);
    const result = await printLabel(labelData);

    console.log('Print job result:', result);
    return NextResponse.json({ message: result })
  } catch (error) {
    console.error("Error during printer test:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    return NextResponse.json({ 
      error: "Failed to complete printer test", 
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}