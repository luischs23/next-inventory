import { NextResponse } from 'next/server';
import type { NextRequest } from "next/server";
import { auth  } from '../../../app/context/AuthContext';

export async function GET(req: NextRequest) {
  if (!auth?.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ message: "Acceso permitido" });
}
