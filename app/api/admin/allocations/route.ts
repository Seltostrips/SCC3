import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const allocations = await prisma.allocation.findMany({
      orderBy: { assessmentYear: "desc" },
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error("Admin allocations fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
