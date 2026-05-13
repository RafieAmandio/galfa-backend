import * as XLSX from "xlsx";

export interface FixedRateRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  annualRate: number;
  startDate: string;
  endDate: string;
  isRollover: boolean;
  description: string;
}

export interface FloatingRateRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  isRollover: boolean;
  description: string;
}

export interface InstallmentRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  monthlyCoF: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  investmentType: string;
  description: string;
}

export interface ParseResult {
  fixedRate: FixedRateRow[];
  floatingRate: FloatingRateRow[];
  installment: InstallmentRow[];
}

function parseDateCell(cell: unknown): string {
  if (cell instanceof Date) {
    return cell.toISOString().split("T")[0];
  }
  if (typeof cell === "number") {
    // Excel serial date number
    const date = XLSX.SSF.parse_date_code(cell);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof cell === "string") {
    return cell.trim();
  }
  return "";
}

function parseBoolean(cell: unknown): boolean {
  if (typeof cell === "boolean") return cell;
  if (typeof cell === "string") {
    const lower = cell.toLowerCase().trim();
    return lower === "yes" || lower === "true" || lower === "1";
  }
  if (typeof cell === "number") return cell === 1;
  return false;
}

export function parseImportFile(arrayBuffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

  const result: ParseResult = {
    fixedRate: [],
    floatingRate: [],
    installment: [],
  };

  // Parse Fixed Rate sheet
  const fixedRateSheet = wb.Sheets["Fixed Rate"];
  if (fixedRateSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(fixedRateSheet, {
      header: 1,
    });
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // Skip empty rows
      result.fixedRate.push({
        investorEmail: String(row[0] ?? "").trim().toLowerCase(),
        accountNumber: String(row[1] ?? "").trim(),
        capital: Number(row[2]) || 0,
        annualRate: Number(row[3]) || 0,
        startDate: parseDateCell(row[4]),
        endDate: parseDateCell(row[5]),
        isRollover: parseBoolean(row[6]),
        description: String(row[7] ?? "").trim(),
      });
    }
  }

  // Parse Floating Rate sheet
  const floatingRateSheet = wb.Sheets["Floating Rate"];
  if (floatingRateSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(floatingRateSheet, {
      header: 1,
    });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      result.floatingRate.push({
        investorEmail: String(row[0] ?? "").trim().toLowerCase(),
        accountNumber: String(row[1] ?? "").trim(),
        capital: Number(row[2]) || 0,
        adminFeePercentage: Number(row[3]) || 0,
        startDate: parseDateCell(row[4]),
        endDate: parseDateCell(row[5]),
        isRollover: parseBoolean(row[6]),
        description: String(row[7] ?? "").trim(),
      });
    }
  }

  // Parse Installment sheet
  const installmentSheet = wb.Sheets["Installment"];
  if (installmentSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(installmentSheet, {
      header: 1,
    });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      result.installment.push({
        investorEmail: String(row[0] ?? "").trim().toLowerCase(),
        accountNumber: String(row[1] ?? "").trim(),
        capital: Number(row[2]) || 0,
        monthlyCoF: Number(row[3]) || 0,
        adminFeePercentage: Number(row[4]) || 0,
        startDate: parseDateCell(row[5]),
        endDate: parseDateCell(row[6]),
        investmentType: String(row[7] ?? "").trim(),
        description: String(row[8] ?? "").trim(),
      });
    }
  }

  return result;
}
