"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  installmentAccounts,
  accountTypes,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { isAccountNumberUnique } from "@/features/investments/actions/is-account-number-unique";
import { zfd } from "zod-form-data";
import { z } from "zod";

export async function createInstallmentAccount(
  prevState: any,
  formData: FormData
) {
  // Admin Check
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  // Validation using zod-form-data and zod
  const validationResult = await zfd
    .formData({
      investorEmail: zfd.text(z.email()),
      accountNumber: zfd.text(z.string().min(1)),
      capital: zfd.numeric(z.number().min(0)),
      monthlyCoF: zfd.numeric(z.number().min(0)),
      transactionDate: zfd.text(z.iso.datetime()),
      endDate: zfd.text(z.iso.datetime()),
      investmentType: zfd.text(z.string().min(1)),
      adminFeePercentage: zfd.numeric(z.number().min(0).max(100)),
      description: zfd.text(z.string().optional()),
    })
    .safeParseAsync(formData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validationResult.error.issues.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    };
  }

  const {
    investorEmail,
    accountNumber,
    capital,
    monthlyCoF,
    transactionDate,
    endDate,
    investmentType,
    adminFeePercentage,
    description,
  } = validationResult.data;

  try {
    // Check if account number is unique
    const isUnique = await isAccountNumberUnique(accountNumber);
    if (!isUnique) {
      return {
        success: false,
        message: "Account number already exists",
        errors: [
          { field: "accountNumber", message: "Account number must be unique" },
        ],
      };
    }

    // Get database connection
    const db = await createDrizzleConnection();

    // Get investor profile by email from auth users
    const investorProfile = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, investorEmail))
      .limit(1);

    if (investorProfile.length === 0) {
      return {
        success: false,
        message: "Investor not found",
        errors: [
          { field: "investorEmail", message: "Investor does not exist" },
        ],
      };
    }

    // Get account type for installment
    const accountType = await db
      .select()
      .from(accountTypes)
      .where(eq(accountTypes.name, "installment"))
      .limit(1);

    if (accountType.length === 0) {
      return {
        success: false,
        message: "Installment account type not found",
        errors: [
          { field: "general", message: "Account type configuration error" },
        ],
      };
    }

    // Calculate Admin Fee (Input is Percentage while DB is the actual value)
    const adminFee = capital * (adminFeePercentage / 100);

    // Monthly CoF (Input is Percentage while DB is in Decimal)
    const monthlyCoFPercentage = monthlyCoF / 100;

    // Normalize dates to have the same hour (use transaction date's hour)
    const transactionDateObj = new Date(transactionDate);
    const endDateObj = new Date(endDate);

    // Set both dates to have the same hour (using transaction date's hour)
    const normalizedTransactionDate = new Date(transactionDateObj);
    const normalizedEndDate = new Date(endDateObj);
    normalizedEndDate.setHours(
      normalizedTransactionDate.getHours(),
      normalizedTransactionDate.getMinutes(),
      normalizedTransactionDate.getSeconds(),
      normalizedTransactionDate.getMilliseconds()
    );

    // Create the main account first
    const [newMainAccount] = await db
      .insert(accounts)
      .values({
        account_type_id: accountType[0].id,
        account_number: accountNumber,
        capital: capital.toString(),
        transaction_date: normalizedTransactionDate,
        end_date: normalizedEndDate,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        is_rollover: false,
        admin_fee_applied: true,
        user_id: investorProfile[0].id,
      })
      .returning();

    // Create the installment account
    const [newInstallmentAccount] = await db
      .insert(installmentAccounts)
      .values({
        account_id: newMainAccount.id,
        monthly_cof: monthlyCoFPercentage.toString(),
        admin_fee: adminFee.toString(),
        investment_type: investmentType,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return {
      success: true,
      message: "Installment account created successfully",
      data: {
        mainAccount: newMainAccount,
        installmentAccount: newInstallmentAccount,
      },
    };
  } catch (error) {
    console.error("Error creating installment account:", error);
    return {
      success: false,
      message: "Failed to create installment account",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
