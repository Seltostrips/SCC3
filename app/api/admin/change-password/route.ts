import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { newPassword } = await request.json();

    // In a real application, you would get the current admin user's ID from a session or token.
    // For this example, we'll assume a known admin user 'seltostrips' for password change.
    const adminUsername = "seltostrips"; 

    if (!newPassword) {
      return NextResponse.json({ message: "New password is required" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedAdmin = await prisma.user.update({
      where: { username: adminUsername },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Admin password updated successfully" });
  } catch (error) {
    console.error("Admin change password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
