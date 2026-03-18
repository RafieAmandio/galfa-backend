import { z } from "zod";
import type {
  FixedRateRow,
  FloatingRateRow,
  InstallmentRow,
} from "./excel-parser";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const fixedRateSchema = z
  .object({
    investorEmail: z.string().email("Invalid email format"),
    accountNumber: z.string().min(1, "Account number is required"),
    capital: z.number().positive("Capital must be positive"),
    annualRate: z
      .number()
      .positive("Annual rate must be positive")
      .max(100, "Annual rate must be <= 100%"),
    startDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    endDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    isRollover: z.boolean(),
    description: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

const floatingRateSchema = z
  .object({
    investorEmail: z.string().email("Invalid email format"),
    accountNumber: z.string().min(1, "Account number is required"),
    capital: z.number().positive("Capital must be positive"),
    adminFeePercentage: z
      .number()
      .min(0, "Admin fee must be >= 0")
      .max(100, "Admin fee must be <= 100%"),
    startDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    endDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    description: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

const installmentSchema = z
  .object({
    investorEmail: z.string().email("Invalid email format"),
    accountNumber: z.string().min(1, "Account number is required"),
    capital: z.number().positive("Capital must be positive"),
    monthlyCoF: z
      .number()
      .min(0, "Monthly CoF must be >= 0")
      .max(100, "Monthly CoF must be <= 100%"),
    adminFeePercentage: z
      .number()
      .min(0, "Admin fee must be >= 0")
      .max(100, "Admin fee must be <= 100%"),
    startDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    endDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD"),
    investmentType: z.enum(["principle", "interest_only"], {
      errorMap: () => ({
        message: "Investment type must be 'principle' or 'interest_only'",
      }),
    }),
    description: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export interface ValidationResult<T> {
  rowIndex: number;
  data: T;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export function validateFixedRateRows(
  rows: FixedRateRow[]
): ValidationResult<FixedRateRow>[] {
  return rows.map((row, index) => {
    const result = fixedRateSchema.safeParse(row);
    return {
      rowIndex: index,
      data: row,
      errors: result.success
        ? []
        : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      warnings: [],
      isValid: result.success,
    };
  });
}

export function validateFloatingRateRows(
  rows: FloatingRateRow[]
): ValidationResult<FloatingRateRow>[] {
  return rows.map((row, index) => {
    const result = floatingRateSchema.safeParse(row);
    return {
      rowIndex: index,
      data: row,
      errors: result.success
        ? []
        : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      warnings: [],
      isValid: result.success,
    };
  });
}

export function validateInstallmentRows(
  rows: InstallmentRow[]
): ValidationResult<InstallmentRow>[] {
  return rows.map((row, index) => {
    const result = installmentSchema.safeParse(row);
    return {
      rowIndex: index,
      data: row,
      errors: result.success
        ? []
        : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      warnings: [],
      isValid: result.success,
    };
  });
}
