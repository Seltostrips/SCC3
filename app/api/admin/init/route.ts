import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const adminUsername = "seltostrips";
    const adminPassword = "Shubi@123";
    const adminName = "Master Admin";

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {
        name: adminName,
        password: hashedPassword,
        role: "ADMIN",
      },
      create: {
        username: adminUsername,
        name: adminName,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    return NextResponse.json({ message: "Admin user upserted successfully", admin });
  } catch (error) {
    console.error("Admin init error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
