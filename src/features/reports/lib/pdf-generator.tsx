import { renderToBuffer } from "@react-pdf/renderer";
import { InvestmentReportDocument } from "../pdf/investment-report-document";
import type { InvestorReportData } from "../actions/get-report-data";

export async function generatePdfBuffer(
  data: InvestorReportData
): Promise<Buffer> {
  const pdfBuffer = await renderToBuffer(
    <InvestmentReportDocument data={data} />
  );
  return Buffer.from(pdfBuffer);
}

export function generatePdfFilename(email: string): string {
  const date = new Date().toISOString().split("T")[0];
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  return `investment-report-${sanitizedEmail}-${date}.pdf`;
}
