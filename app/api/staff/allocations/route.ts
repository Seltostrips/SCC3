import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");

    if (!staffId) {
      return NextResponse.json({ message: "Staff ID is required" }, { status: 400 });
    }

    const allocations = await prisma.allocation.findMany({
      where: { staffID: staffId },
      orderBy: { assessmentYear: "desc" },
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error("Staff allocations fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
