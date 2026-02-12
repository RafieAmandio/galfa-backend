"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getAllInvestorEmails } from "@/features/investor/actions/get-investor-summary";
import { getReportData } from "./get-report-data";
import {
  generatePdfBuffer,
  generatePdfFilename,
} from "../lib/pdf-generator";
import { sendReportEmail } from "../lib/email-service";

interface BulkSendResult {
  success: boolean;
  message: string;
  totalInvestors: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
}

export async function sendBulkReports(): Promise<BulkSendResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized - Admin access required",
      totalInvestors: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  try {
    // Get all investor emails
    const investorEmails = await getAllInvestorEmails();

    if (investorEmails.length === 0) {
      return {
        success: true,
        message: "No investors found to send reports to",
        totalInvestors: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
      };
    }

    // Process investors in batches of 5 for controlled concurrency
    const BATCH_SIZE = 5;
    const results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < investorEmails.length; i += BATCH_SIZE) {
      const batch = investorEmails.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          // Get report data
          const reportResult = await getReportData(email);

          if (!reportResult.success || !reportResult.data) {
            throw new Error(
              reportResult.error || "Failed to generate report data"
            );
          }

          // Generate PDF
          const pdfBuffer = await generatePdfBuffer(reportResult.data);
          const pdfFilename = generatePdfFilename(email);

          // Send email
          const emailResult = await sendReportEmail(
            email,
            pdfBuffer,
            pdfFilename
          );

          if (!emailResult.success) {
            throw new Error(emailResult.error || "Failed to send email");
          }

          return email;
        })
      );

      // Collect results from this batch
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const email = batch[j];

        if (result.status === "fulfilled") {
          results.push({ email, success: true });
          successCount++;
        } else {
          results.push({
            email,
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown error",
          });
          failedCount++;
        }
      }
    }

    return {
      success: failedCount === 0,
      message:
        failedCount === 0
          ? `Successfully sent reports to all ${successCount} investors`
          : `Sent ${successCount} reports, ${failedCount} failed`,
      totalInvestors: investorEmails.length,
      successCount,
      failedCount,
      results,
    };
  } catch (error) {
    console.error("Error sending bulk reports:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send bulk reports",
      totalInvestors: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
    };
  }
}
