import { getReportData } from "../src/features/reports/actions/get-report-data";
import { generatePdfBuffer } from "../src/features/reports/lib/pdf-generator";
import { writeFileSync } from "fs";

async function main() {
  const email = process.argv[2] || "aqila.dika@galfaco.com";
  console.log(`Generating report for ${email}...`);

  const result = await getReportData(email);
  if (!result.success || !result.data) {
    console.error("Failed to get report data:", result.error);
    process.exit(1);
  }

  console.log("Report data:", {
    flatRate: result.data.flatRateInvestments.length,
    floatingRate: result.data.floatingRateInvestments.length,
    installment: result.data.installmentInvestments.length,
    capitalMarket: result.data.capitalMarketInvestments.length,
    statementYears: result.data.statementOfAccount?.years.length ?? 0,
  });

  const pdfBuffer = await generatePdfBuffer(result.data);
  const outputPath = `/tmp/aqila-report-${Date.now()}.pdf`;
  writeFileSync(outputPath, pdfBuffer);
  console.log(`PDF saved to ${outputPath}`);
}

main().catch(console.error);
