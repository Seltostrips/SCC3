import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientPAN = searchParams.get("pan");

    if (!clientPAN) {
      return NextResponse.json({ message: "Client PAN is required" }, { status: 400 });
    }

    const allocations = await prisma.allocation.findMany({
      where: { clientPAN },
      orderBy: { assessmentYear: "desc" },
    });

    return NextResponse.json(allocations);
  } catch (error) {
    console.error("Client allocations fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
