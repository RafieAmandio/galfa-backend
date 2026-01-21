import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth-helpers";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getReportData } from "@/features/reports/actions/get-report-data";
import {
  generatePdfBuffer,
  generatePdfFilename,
} from "@/features/reports/lib/pdf-generator";

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

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization - user can only download their own report, or admin can download any
    const adminCheck = await checkAdminAccess();
    const isAdmin = adminCheck.isAdmin;

    if (!isAdmin && user.email !== email) {
      return NextResponse.json(
        { error: "Forbidden - You can only download your own report" },
        { status: 403 }
      );
    }

    // Get report data
    const reportResult = await getReportData(email);

    console.log("Report data result:", {
      success: reportResult.success,
      error: reportResult.error,
      hasData: !!reportResult.data,
      summary: reportResult.data?.summary,
      flatRateCount: reportResult.data?.flatRateInvestments?.length ?? 0,
      floatingRateCount: reportResult.data?.floatingRateInvestments?.length ?? 0,
      installmentCount: reportResult.data?.installmentInvestments?.length ?? 0,
    });

    if (!reportResult.success || !reportResult.data) {
      return NextResponse.json(
        { error: reportResult.error || "Failed to generate report data" },
        { status: 500 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer(reportResult.data);
    const filename = generatePdfFilename(email);

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}
