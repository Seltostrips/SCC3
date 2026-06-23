import { NextResponse } from "next/server";
import { PrismaClient, AllocationStatus, Prisma } from "@prisma/client";
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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "Upload Halted: Please select an Excel file before submitting." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const records: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Pre-flight check: Is the file empty?
    if (records.length === 0) {
      return NextResponse.json({ message: "Upload Halted: The provided Excel file contains no data." }, { status: 400 });
    }

    // Pre-flight check: Are the headers correct?
    const firstRecord = records[0];
    if (!firstRecord.PAN || !firstRecord.StaffID || !firstRecord.AssessmentYear) {
      return NextResponse.json({ message: "Upload Halted: Missing required columns. Ensure your Excel headers exactly match: 'PAN', 'StaffID', and 'AssessmentYear'." }, { status: 400 });
    }

    const allocationsToCreate = [];
    for (const record of records) {
      if (!ALLOWED_ASSESSMENT_YEARS.includes(record.AssessmentYear)) {
        return NextResponse.json({ message: `Upload Halted: Invalid Assessment Year detected (${record.AssessmentYear}). Please use a valid format like '2026-27'.` }, { status: 400 });
      }
      
      allocationsToCreate.push({
        clientPAN: record.PAN,
        staffID: record.StaffID,
        assessmentYear: record.AssessmentYear,
        status: "Allocated" as AllocationStatus, 
        billingStatus: "Unbilled", 
      });
    }

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

    return NextResponse.json({ message: "Allocations uploaded and synchronized successfully!" });

  } catch (error) {
    console.error("Admin Excel upload (allocations) error:", error);
    
    // Human-Readable Error Interceptor
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        const field = error.meta?.field_name as string || "";
        if (field.includes("clientPAN")) {
          return NextResponse.json({ message: "Upload Halted: A Client PAN in your file does not exist in the System. Please onboard the client first." }, { status: 400 });
        }
        if (field.includes("staffID")) {
          return NextResponse.json({ message: "Upload Halted: A Staff ID in your file does not exist in the System. Please onboard the staff member first." }, { status: 400 });
        }
        return NextResponse.json({ message: "Upload Halted: A referenced Client or Staff member is missing from the system." }, { status: 400 });
      }
    }

    return NextResponse.json({ message: "A system error occurred while processing the file. Please try again." }, { status: 500 });
  }
}
