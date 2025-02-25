import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth } from "app/services/firebase/firebaseAdmin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return NextResponse.json({ message: "Acceso permitido", uid: decodedToken.uid });
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
