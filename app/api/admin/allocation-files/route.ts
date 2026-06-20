import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { listFiles } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ files: [] });

    const allocation = await prisma.allocation.findUnique({ where: { id } });
    if (!allocation) return NextResponse.json({ files: [] });

    const files = await listFiles(allocation.clientPAN, allocation.assessmentYear);
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ error: "Server error while fetching files" }, { status: 500 });
  }
}
