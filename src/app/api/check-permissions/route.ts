import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "app/services/firebase/firebase.config";

export async function GET(req: NextRequest) {
  if (!auth.currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ message: "Acceso permitido" });
}
