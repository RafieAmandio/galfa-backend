import * as XLSX from "xlsx";

const FIXED_RATE_HEADERS = [
  "Investor Email",
  "Account Number",
  "Capital",
  "Annual Rate (%)",
  "Start Date",
  "End Date",
  "Is Rollover",
  "Description",
];

const FLOATING_RATE_HEADERS = [
  "Investor Email",
  "Account Number",
  "Capital",
  "Admin Fee (%)",
  "Start Date",
  "End Date",
  "Is Rollover",
  "Description",
];

const INSTALLMENT_HEADERS = [
  "Investor Email",
  "Account Number",
  "Capital",
  "Monthly CoF (%)",
  "Admin Fee (%)",
  "Start Date",
  "End Date",
  "Investment Type",
  "Description",
];

const FIXED_RATE_EXAMPLE = [
  "investor@example.com",
  "FR-001",
  100000000,
  12,
  "2025-01-01",
  "2026-01-01",
  "No",
  "Initial investment",
];

const FLOATING_RATE_EXAMPLE = [
  "investor@example.com",
  "FL-001",
  100000000,
  5,
  "2025-01-01",
  "2026-01-01",
  "No",
  "Initial floating investment",
];

const INSTALLMENT_EXAMPLE = [
  "investor@example.com",
  "IN-001",
  100000000,
  2,
  5,
  "2025-01-01",
  "2026-01-01",
  "principle",
  "Monthly installment investment",
];

export function generateTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Fixed Rate sheet
  const fixedRateData = [FIXED_RATE_HEADERS, FIXED_RATE_EXAMPLE];
  const fixedRateWs = XLSX.utils.aoa_to_sheet(fixedRateData);
  fixedRateWs["!cols"] = FIXED_RATE_HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, fixedRateWs, "Fixed Rate");

  // Floating Rate sheet
  const floatingRateData = [FLOATING_RATE_HEADERS, FLOATING_RATE_EXAMPLE];
  const floatingRateWs = XLSX.utils.aoa_to_sheet(floatingRateData);
  floatingRateWs["!cols"] = FLOATING_RATE_HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, floatingRateWs, "Floating Rate");

  // Installment sheet
  const installmentData = [INSTALLMENT_HEADERS, INSTALLMENT_EXAMPLE];
  const installmentWs = XLSX.utils.aoa_to_sheet(installmentData);
  installmentWs["!cols"] = INSTALLMENT_HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, installmentWs, "Installment");

  return wb;
}
