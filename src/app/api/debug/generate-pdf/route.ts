import { NextRequest, NextResponse } from "next/server";
import { getReportData } from "@/features/reports/actions/get-report-data";
import {
  generatePdfBuffer,
  generatePdfFilename,
} from "@/features/reports/lib/pdf-generator";

// Temporary debug route - no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const reportResult = await getReportData(email);

    if (!reportResult.success || !reportResult.data) {
      return NextResponse.json(
        { error: reportResult.error || "Failed to generate report data" },
        { status: 500 }
      );
    }

    const pdfBuffer = await generatePdfBuffer(reportResult.data);
    const filename = generatePdfFilename(email);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Debug PDF generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
