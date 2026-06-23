import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as xlsx from "xlsx";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "Excel file required" }, { status: 400 });
    }

    // 1. Read the Excel File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    
    // Convert the first sheet to a JSON array
    const records: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    // 2. Prepare the users for the database
    const usersToCreate = [];
    for (const record of records) {
      // Adjusted to match the exact lowercase headers from the new template
      const hashedPassword = await bcrypt.hash(record.password, 10);
      usersToCreate.push({
        username: record.username, 
        name: record.name || "Unknown User",
        role: record.role.toUpperCase(), // Ensures 'staff' becomes 'STAFF'
        password: hashedPassword,
      });
    }

    // 3. Upsert using a Prisma transaction to ensure all-or-nothing saving
    await prisma.$transaction(
      usersToCreate.map((user) =>
        prisma.user.upsert({
          where: { username: user.username },
          update: user,
          create: user,
        })
      )
    );

    return NextResponse.json({ message: "Users uploaded successfully" });
  } catch (error) {
    console.error("Admin Excel upload (users) error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
