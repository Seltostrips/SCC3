import { NextResponse } from "next/server";
import { PrismaClient, AllocationStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { allocationId, newStatus, comments } = await request.json();

    if (!allocationId || !newStatus) {
      return NextResponse.json({ message: "Allocation ID and new status are required" }, { status: 400 });
    }

    const updatedAllocation = await prisma.allocation.update({
      where: { id: allocationId },
      data: {
        status: newStatus,
        comments: comments || null, // Clear comments if not provided
      },
    });

    return NextResponse.json({ message: "Allocation status updated successfully", allocation: updatedAllocation });
  } catch (error) {
    console.error("Admin update allocation error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
