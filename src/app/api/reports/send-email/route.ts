import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { sendInvestorReport } from "@/features/reports/actions/send-investor-report";
import { sendBulkReports } from "@/features/reports/actions/send-bulk-reports";

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if bulk send
    if (body.bulk === true) {
      const result = await sendBulkReports();
      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      });
    }

    // Single investor send
    const { investorEmail } = body;

    if (!investorEmail) {
      return NextResponse.json(
        { error: "investorEmail is required" },
        { status: 400 }
      );
    }

    const result = await sendInvestorReport(investorEmail);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Send email API error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
