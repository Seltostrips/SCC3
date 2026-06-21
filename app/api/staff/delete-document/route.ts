import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { deleteFile } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET || "fallback-development-secret-scc3-2026";
const encodedKey = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    const staffUsername = payload.username as string;

    const { allocationId, folder, filename } = await request.json();
    
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.staffID.toLowerCase() !== staffUsername.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteFile(allocation.clientPAN, allocation.assessmentYear, folder, filename);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
