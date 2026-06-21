import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Prevent Next.js from caching this route so the dashboard is always live
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allocations = await prisma.allocation.findMany({
      include: {
        // Pull the actual names from the User table using the relational links
        client: { select: { name: true } },
        staff: { select: { name: true } }
      },
      orderBy: {
        assessmentYear: 'desc'
      }
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error("Fetch allocations error:", error);
    return NextResponse.json({ message: "Failed to fetch allocations" }, { status: 500 });
  }
}
