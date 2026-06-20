"use client";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Username already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        username,
        name: "New Admin", // You might want to get this from the request as well
        role: "ADMIN",
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: "New admin created successfully", admin: newAdmin });
  } catch (error) {
    console.error("Admin create error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
