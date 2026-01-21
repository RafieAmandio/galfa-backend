"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getReportData } from "./get-report-data";
import {
  generatePdfBuffer,
  generatePdfFilename,
} from "../lib/pdf-generator";
import { sendReportEmail } from "../lib/email-service";

interface SendReportResult {
  success: boolean;
  message: string;
  messageId?: string;
}

export async function sendInvestorReport(
  investorEmail: string
): Promise<SendReportResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized - Admin access required",
    };
  }

  if (!investorEmail) {
    return {
      success: false,
      message: "Investor email is required",
    };
  }

  try {
    // Get report data
    const reportResult = await getReportData(investorEmail);

    if (!reportResult.success || !reportResult.data) {
      return {
        success: false,
        message: reportResult.error || "Failed to generate report data",
      };
    }

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer(reportResult.data);
    const pdfFilename = generatePdfFilename(investorEmail);

    // Send email with PDF attachment
    const emailResult = await sendReportEmail(
      investorEmail,
      pdfBuffer,
      pdfFilename
    );

    if (!emailResult.success) {
      return {
        success: false,
        message: emailResult.error || "Failed to send email",
      };
    }

    return {
      success: true,
      message: `Report sent successfully to ${investorEmail}`,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    console.error("Error sending investor report:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send report",
    };
  }
}
