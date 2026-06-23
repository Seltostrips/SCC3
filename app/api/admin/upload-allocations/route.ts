import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";

const prisma = new PrismaClient();

const ALLOWED_ASSESSMENT_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // Front-end now sends this under the key 'file' instead of 'csvFile'
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "Excel file required" }, { status: 400 });
    }

    // 1. Read the Excel File Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    
    // 2. Convert the first sheet to a JSON array
    const sheetName = workbook.SheetNames[0];
    const records: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 3. Loop through and validate the data mapping
    const allocationsToCreate = [];
    for (const record of records) {
      if (!ALLOWED_ASSESSMENT_YEARS.includes(record.AssessmentYear)) {
        return NextResponse.json(
          { message: `Upload halted: Invalid Assessment Year detected (${record.AssessmentYear}).` },
          { status: 400 }
        );
      }
      
      allocationsToCreate.push({
        clientPAN: record.PAN,
        staffID: record.StaffID,
        assessmentYear: record.AssessmentYear,
        status: "Allocated", 
        billingStatus: "Unbilled", 
      });
    }

    // 4. Securely upsert to the database via transaction
    await prisma.$transaction(
      allocationsToCreate.map((allocation) =>
        prisma.allocation.upsert({
          where: { 
            clientPAN_assessmentYear: { 
              clientPAN: allocation.clientPAN, 
              assessmentYear: allocation.assessmentYear 
            } 
          },
          update: allocation,
          create: allocation,
        })
      )
    );

    return NextResponse.json({ message: "Allocations uploaded successfully" });
  } catch (error) {
    console.error("Admin Excel upload (allocations) error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
