import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

    // FIX: Correctly parse the incoming FormData we set up on the frontend
    const formData = await request.formData();
    const allocationId = formData.get("allocationId") as string;
    const newStatus = formData.get("newStatus") as string;

    if (!allocationId || !newStatus) {
      return NextResponse.json({ message: "Missing parameters" }, { status: 400 });
    }

    // Security Verification: Ensure the allocation belongs to this exact staff member
    const allocation = await prisma.allocation.findUnique({ where: { id: allocationId } });
    
    if (!allocation) {
      return NextResponse.json({ message: "Allocation not found" }, { status: 404 });
    }

    // Case-insensitive check just in case "Staff_1" was uploaded as "staff_1"
    if (allocation.staffID.toLowerCase() !== staffUsername.toLowerCase()) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Process the status update
    await prisma.allocation.update({
      where: { id: allocationId },
      data: { status: newStatus }
    });

    return NextResponse.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Status update crash:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
