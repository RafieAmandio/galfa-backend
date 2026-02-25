"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createFlatRateAccount } from "@/features/flat-rate/actions/create-flat-rate-account";
import { createFloatingRateAccount } from "@/features/floating-rate/actions/create-floating-rate-account";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  installmentAccounts,
  accountTypes,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { isAccountNumberUnique } from "@/features/investments/actions/is-account-number-unique";

interface FixedRateImportRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  annualRate: number;
  startDate: string;
  endDate: string;
  isRollover: boolean;
  description: string;
}

interface FloatingRateImportRow {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  adminFeePercentage: number;
  startDate: string;
  endDate: string;
  description: string;
}

interface InstallmentImportRow {
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

interface RowResult {
  type: string;
  rowIndex: number;
  accountNumber: string;
  success: boolean;
  message: string;
}

interface BulkImportResult {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  results: RowResult[];
}

export async function bulkImportAccounts(
  fixedRateRows: FixedRateImportRow[],
  floatingRateRows: FloatingRateImportRow[],
  installmentRows: InstallmentImportRow[]
): Promise<BulkImportResult> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      results: [
        {
          type: "auth",
          rowIndex: -1,
          accountNumber: "",
          success: false,
          message: "Unauthorized: Admin access required",
        },
      ],
    };
  }

  const results: RowResult[] = [];

  // Process Fixed Rate rows
  for (let i = 0; i < fixedRateRows.length; i++) {
    const row = fixedRateRows[i];
    try {
      const result = await createFlatRateAccount({
        investorEmail: row.investorEmail,
        accountNumber: row.accountNumber,
        capital: row.capital,
        annualRate: row.annualRate / 100, // Convert percentage to decimal
        transactionDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        isRollover: row.isRollover,
        description: row.description || undefined,
      });
      results.push({
        type: "Fixed Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      results.push({
        type: "Fixed Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Process Floating Rate rows
  for (let i = 0; i < floatingRateRows.length; i++) {
    const row = floatingRateRows[i];
    try {
      const result = await createFloatingRateAccount({
        investorEmail: row.investorEmail,
        accountNumber: row.accountNumber,
        capital: row.capital,
        adminFeePercentage: row.adminFeePercentage / 100, // Convert percentage to decimal
        transactionDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        description: row.description || undefined,
      });
      results.push({
        type: "Floating Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      results.push({
        type: "Floating Rate",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Process Installment rows (inline DB logic since existing action uses FormData)
  for (let i = 0; i < installmentRows.length; i++) {
    const row = installmentRows[i];
    try {
      // Validate account number uniqueness
      const isUnique = await isAccountNumberUnique(row.accountNumber);
      if (!isUnique) {
        results.push({
          type: "Installment",
          rowIndex: i,
          accountNumber: row.accountNumber,
          success: false,
          message: `Account number "${row.accountNumber}" already exists`,
        });
        continue;
      }

      const db = createDrizzleConnection();

      // Find investor by email
      const investorProfile = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.email, row.investorEmail))
        .limit(1);

      if (investorProfile.length === 0) {
        results.push({
          type: "Installment",
          rowIndex: i,
          accountNumber: row.accountNumber,
          success: false,
          message: `Investor with email ${row.investorEmail} not found`,
        });
        continue;
      }

      // Get installment account type
      const accountType = await db
        .select()
        .from(accountTypes)
        .where(eq(accountTypes.name, "installment"))
        .limit(1);

      if (accountType.length === 0) {
        results.push({
          type: "Installment",
          rowIndex: i,
          accountNumber: row.accountNumber,
          success: false,
          message: "Installment account type not found in database",
        });
        continue;
      }

      // Calculate admin fee and monthly CoF
      const adminFee = row.capital * (row.adminFeePercentage / 100);
      const monthlyCoFDecimal = row.monthlyCoF / 100;

      const transactionDateObj = new Date(row.startDate);
      const endDateObj = new Date(row.endDate);
      endDateObj.setHours(
        transactionDateObj.getHours(),
        transactionDateObj.getMinutes(),
        transactionDateObj.getSeconds(),
        transactionDateObj.getMilliseconds()
      );

      // Create main account
      const [newMainAccount] = await db
        .insert(accounts)
        .values({
          account_type_id: accountType[0].id,
          account_number: row.accountNumber,
          capital: row.capital.toString(),
          transaction_date: transactionDateObj,
          end_date: endDateObj,
          status: "active",
          created_at: new Date(),
          updated_at: new Date(),
          is_rollover: false,
          admin_fee_applied: true,
          user_id: investorProfile[0].id,
        })
        .returning();

      // Create installment account
      await db.insert(installmentAccounts).values({
        account_id: newMainAccount.id,
        monthly_cof: monthlyCoFDecimal.toString(),
        admin_fee: adminFee.toString(),
        investment_type: row.investmentType,
        created_at: new Date(),
        updated_at: new Date(),
      });

      results.push({
        type: "Installment",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: true,
        message: `Installment account ${row.accountNumber} created successfully`,
      });
    } catch (error) {
      results.push({
        type: "Installment",
        rowIndex: i,
        accountNumber: row.accountNumber,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalSuccess = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;

  return {
    totalProcessed: results.length,
    totalSuccess,
    totalFailed,
    results,
  };
}
