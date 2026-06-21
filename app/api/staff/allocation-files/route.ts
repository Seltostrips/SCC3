import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { listFiles } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET || "fallback-development-secret-scc3-2026";
const encodedKey = new TextEncoder().encode(secretKey);
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return NextResponse.json({ files: [] }, { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    const staffUsername = payload.username as string;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ files: [] });

    const allocation = await prisma.allocation.findUnique({ where: { id } });
    if (!allocation || allocation.staffID.toLowerCase() !== staffUsername.toLowerCase()) {
      return NextResponse.json({ files: [] });
    }

    const files = await listFiles(allocation.clientPAN, allocation.assessmentYear);
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
