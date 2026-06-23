import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as xlsx from "xlsx";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "Upload Halted: Please select an Excel file before submitting." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const records: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    // Pre-flight check: Is the file empty?
    if (records.length === 0) {
      return NextResponse.json({ message: "Upload Halted: The provided Excel file contains no data." }, { status: 400 });
    }

    // Pre-flight check: Are the headers correct?
    const firstRecord = records[0];
    if (!firstRecord.username || !firstRecord.role || !firstRecord.password) {
      return NextResponse.json({ message: "Upload Halted: Missing required columns. Ensure your Excel headers exactly match: 'role', 'username', 'password', and 'name'." }, { status: 400 });
    }

    const usersToCreate = [];
    for (const record of records) {
      const hashedPassword = await bcrypt.hash(record.password.toString(), 10);
      usersToCreate.push({
        username: record.username.toString(), 
        name: record.name ? record.name.toString() : "Unknown User",
        role: record.role.toString().toUpperCase(), 
        password: hashedPassword,
      });
    }

    await prisma.$transaction(
      usersToCreate.map((user) =>
        prisma.user.upsert({
          where: { username: user.username },
          update: user,
          create: user,
        })
      )
    );

    return NextResponse.json({ message: "Users onboarded and synchronized successfully!" });

  } catch (error) {
    console.error("Admin Excel upload (users) error:", error);
    
    // Human-Readable Error Interceptor
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ message: "Upload Halted: One or more usernames in this file already exist and caused a conflict." }, { status: 400 });
      }
    }

    return NextResponse.json({ message: "A system error occurred while processing the file. Please try again." }, { status: 500 });
  }
}
