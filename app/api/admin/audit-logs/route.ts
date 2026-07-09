import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch audit logs" }, { status: 500 });
  }
}
