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
    const file = formData.get("file") as File;
    const folderStr = formData.get("folder") as string;

    if (!allocationId || !file || !folderStr) {
      return NextResponse.json({ message: "Missing required file data" }, { status: 400 });
    }

    const folder = parseInt(folderStr);
    if (![1, 2, 3, 4].includes(folder)) {
      return NextResponse.json({ message: "Invalid folder selection" }, { status: 400 });
    }

    // Security Verification: Ensure the allocation belongs to this staff member
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.staffID.toLowerCase() !== staffUsername.toLowerCase()) {
      return NextResponse.json({ message: "Forbidden Access" }, { status: 403 });
    }

    // Execute the Supabase Storage Upload
    await uploadFile(file, allocation.clientPAN, allocation.assessmentYear, folder as 1 | 2 | 3 | 4);

    return NextResponse.json({ message: "Document uploaded to Supabase successfully!" });
  } catch (error: any) {
    console.error("Document upload crash:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
