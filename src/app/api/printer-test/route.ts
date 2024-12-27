import { NextResponse } from 'next/server'

const WINDOWS_API_URL = process.env.WINDOWS_API_URL || 'http://your-windows-api-url.com';

export async function POST(request: Request) {
  try {
    console.log('Received print test request');
    
    // Parse the incoming request body
    const labelData = await request.json();

    // Forward the request to the Windows API
    const response = await fetch(`${WINDOWS_API_URL}/api/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelData),
    });

    if (!response.ok) {
      throw new Error(`Windows API responded with status: ${response.status}`);
    }

    const result = await response.json();

    console.log('Print job result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error during printer test:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: "Failed to complete printer test", 
      details: errorMessage,
    }, { status: 500 })
  }
}

