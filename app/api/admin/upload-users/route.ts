import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get("csvFile") as File;

    if (!csvFile) {
      return NextResponse.json({ message: "CSV file is required" }, { status: 400 });
    }

    const fileContent = await csvFile.text();
    const records: any[] = parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true 
    });

    const usersToCreate = [];
    for (const record of records) {
      const hashedPassword = await bcrypt.hash(record.Password, 10);
      usersToCreate.push({
        username: record.PAN || record.StaffID || "admin", // Assuming PAN for Clients, StaffID for Staff, 'admin' for Admin
        name: record.ClientName || record.StaffName || "Admin User",
        role: record.Role.toUpperCase(), // 'ADMIN', 'STAFF', 'CLIENT'
        password: hashedPassword,
      });
    }

    // Using a transaction to ensure all or nothing
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
    console.error("Admin CSV upload (users) error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
