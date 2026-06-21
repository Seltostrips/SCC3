import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { deleteFile } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { allocationId, folder, filename } = await request.json();
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteFile(allocation.clientPAN, allocation.assessmentYear, folder, filename);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
