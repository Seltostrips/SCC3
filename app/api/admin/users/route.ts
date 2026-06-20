import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Prevent Next.js from caching this route so the refresh button actually works
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      // We explicitly select fields so we NEVER send password hashes to the frontend
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
      orderBy: {
        role: 'asc' // Groups Admins, Clients, and Staff together
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
  }
}
