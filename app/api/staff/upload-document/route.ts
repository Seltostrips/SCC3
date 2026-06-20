import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { uploadFile } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET || "fallback-development-secret-scc3-2026";
const encodedKey = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    const staffUsername = payload.username as string;

    const formData = await request.formData();
    const allocationId = formData.get("allocationId") as string;
    const folderStr = formData.get("folder") as string;

    if (!allocationId || !folderStr) return NextResponse.json({ message: "Missing data" }, { status: 400 });

    const folder = parseInt(folderStr);
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.staffID.toLowerCase() !== staffUsername.toLowerCase()) {
      return NextResponse.json({ message: "Forbidden Access" }, { status: 403 });
    }

    // MULTIPLE FILES FIX: Loop through form data and grab anything that is a file
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) return NextResponse.json({ message: "No files attached" }, { status: 400 });

    // Upload sequentially to Supabase
    for (const file of files) {
      await uploadFile(file, allocation.clientPAN, allocation.assessmentYear, folder as 1 | 2 | 3 | 4);
    }

    return NextResponse.json({ message: `Successfully uploaded ${files.length} document(s)!` });
  } catch (error: any) {
    console.error("Document upload crash:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
