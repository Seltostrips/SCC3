import { NextResponse } from "next/server";
import { PrismaClient, AllocationStatus } from "@prisma/client";
import { parse } from "csv-parse/sync";

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
    const csvFile = formData.get("csvFile") as File;

    if (!csvFile) {
      return NextResponse.json({ message: "CSV file is required" }, { status: 400 });
    }

    const fileContent = await csvFile.text();
    // Added delimiter: ";" to handle the new template format
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";"
    });

    const allocationsToCreate = [];
    for (const record of records) {
      if (!ALLOWED_ASSESSMENT_YEARS.includes(record.AssessmentYear)) {
        return NextResponse.json(
          { message: `Invalid AssessmentYear: ${record.AssessmentYear}` },
          { status: 400 }
        );
      }
      allocationsToCreate.push({
        // Matches the exact columns from your template
        clientPAN: record.PAN,
        staffID: record.StaffID,
        assessmentYear: record.AssessmentYear,
        status: AllocationStatus.Unallocated,
        billingStatus: "Pending", 
      });
    }

    await prisma.$transaction(
      allocationsToCreate.map((allocation) =>
        prisma.allocation.upsert({
          where: {
            clientPAN_assessmentYear: {
              clientPAN: allocation.clientPAN,
              assessmentYear: allocation.assessmentYear,
            },
          },
          update: allocation,
          create: allocation,
        })
      )
    );

    return NextResponse.json({ message: "Allocations uploaded successfully" });
  } catch (error) {
    console.error("Admin CSV upload (allocations) error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
