import { NextResponse } from "next/server";
import { PrismaClient, AllocationStatus } from "@prisma/client";
import { uploadFile } from "@/lib/supabaseStorage";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const allocationId = formData.get("allocationId") as string;
    const newStatus = formData.get("newStatus") as AllocationStatus;
    const file = formData.get("file") as File | null;
    const clientPAN = formData.get("clientPAN") as string;
    const assessmentYear = formData.get("assessmentYear") as string;
    const folder = formData.get("folder") ? parseInt(formData.get("folder") as string) as 1 | 2 | 3 | 4 : undefined;

    if (!allocationId || !newStatus) {
      return NextResponse.json({ message: "Allocation ID and new status are required" }, { status: 400 });
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      return NextResponse.json({ message: "Allocation not found" }, { status: 404 });
    }

    // Handle file upload if provided
    if (file && clientPAN && assessmentYear && folder) {
      await uploadFile(file, clientPAN, assessmentYear, folder);
    }

    // Update allocation status
    const updatedAllocation = await prisma.allocation.update({
      where: { id: allocationId },
      data: { status: newStatus },
    });

    return NextResponse.json({ message: "Allocation status updated successfully", allocation: updatedAllocation });
  } catch (error) {
    console.error("Staff status update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
