"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  accountTypes,
  profiles,
  authUsers,
  mutations,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { isAccountNumberUnique } from "@/features/investments/actions/is-account-number-unique";

interface CreateFloatingRateAccountRequest {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  adminFeePercentage: number; // As decimal (e.g., 0.05 for 5%)
  transactionDate: Date;
  endDate: Date;
  description?: string;
  isRollover?: boolean;
  parentAccountId?: number;
}

interface CreateFloatingRateAccountResult {
  success: boolean;
  message: string;
  accountId?: number;
  accountNumber?: string;
  adminFee?: number;
  netCapital?: number;
}

/**
 * Get or create the floating-rate account type
 */
async function getFloatingRateAccountTypeId(): Promise<number> {
  const db = createDrizzleConnection();

  // First try to find existing floating-rate account type
  const existingType = await db
    .select({ id: accountTypes.id })
    .from(accountTypes)
    .where(eq(accountTypes.name, "floating"))
    .limit(1);

  if (existingType.length > 0) {
    return existingType[0].id;
  }

  // Try to create the account type, handle duplicate key error gracefully
  try {
    const newType = await db
      .insert(accountTypes)
      .values({
        name: "floating",
        description:
          "Floating rate investment accounts with variable performance-based returns",
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: accountTypes.id });

    return newType[0].id;
  } catch (error: any) {
    // If we get a duplicate key error, it means the account type already exists
    // Try to find it again
    if (error?.code === "23505") {
      // PostgreSQL duplicate key error code
      const retryExistingType = await db
        .select({ id: accountTypes.id })
        .from(accountTypes)
        .where(eq(accountTypes.name, "floating"))
        .limit(1);

      if (retryExistingType.length > 0) {
        return retryExistingType[0].id;
      }
    }

    // Re-throw the error if it's not a duplicate key error or we can't find the existing record
    throw error;
  }
}

/**
 * Create a new floating-rate investment account
 */
export async function createFloatingRateAccount(
  request: CreateFloatingRateAccountRequest
): Promise<CreateFloatingRateAccountResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  const db = createDrizzleConnection();

  try {
    // Validate inputs
    if (
      !request.investorEmail ||
      !request.accountNumber ||
      !request.capital ||
      request.adminFeePercentage === undefined
    ) {
      return {
        success: false,
        message:
          "Missing required fields: investor email, account number, capital, and admin fee percentage are required",
      };
    }

    // Validate account number format and uniqueness
    if (!request.accountNumber.trim()) {
      return {
        success: false,
        message: "Account number cannot be empty",
      };
    }

    const isUnique = await isAccountNumberUnique(request.accountNumber);
    if (!isUnique) {
      return {
        success: false,
        message: `Account number "${request.accountNumber}" already exists. Please choose a different account number.`,
      };
    }

    if (request.capital <= 0) {
      return {
        success: false,
        message: "Capital amount must be greater than zero",
      };
    }

    if (request.adminFeePercentage < 0 || request.adminFeePercentage > 1) {
      return {
        success: false,
        message:
          "Admin fee percentage must be between 0 and 1 (e.g., 0.05 for 5%)",
      };
    }

    if (request.transactionDate >= request.endDate) {
      return {
        success: false,
        message: "End date must be after transaction date",
      };
    }

    // Find the investor by email
    const investor = await db
      .select({
        id: profiles.id,
        email: authUsers.email,
      })
      .from(profiles)
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, request.investorEmail))
      .limit(1);

    if (investor.length === 0) {
      return {
        success: false,
        message: `Investor with email ${request.investorEmail} not found`,
      };
    }

    const investorId = investor[0].id;

    // Get account type
    const accountTypeId = await getFloatingRateAccountTypeId();

    // Calculate admin fee and net capital
    const adminFee = request.capital * request.adminFeePercentage;
    const netCapital = request.capital - adminFee;

    // Create the main account record
    const newAccount = await db
      .insert(accounts)
      .values({
        user_id: investorId,
        account_type_id: accountTypeId,
        account_number: request.accountNumber,
        capital: request.capital.toString(),
        transaction_date: request.transactionDate,
        end_date: request.endDate,
        status: "active",
        is_rollover: request.isRollover || false,
        parent_account_id: request.parentAccountId || null,
        admin_fee_applied: true,
        rollover_sequence:
          request.isRollover && request.parentAccountId ? 1 : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: accounts.id });

    const accountId = newAccount[0].id;

    // Create the floating rate account record
    await db.insert(floatingRateAccounts).values({
      account_id: accountId,
      admin_fee: adminFee.toString(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create mutation record for the initial investment
    const mutationDescription = `Initial floating rate investment${
      request.description ? ` - ${request.description}` : ""
    }`;

    await db.insert(mutations).values({
      account_id: accountId,
      type: "inbound",
      amount: request.capital.toString(),
      description: mutationDescription,
      status: "completed",
      transaction_date: request.transactionDate,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      message: `Floating rate investment account ${request.accountNumber} created successfully for ${request.investorEmail}`,
      accountId,
      accountNumber: request.accountNumber,
      adminFee,
      netCapital,
    };
  } catch (error) {
    console.error("Create floating rate account error:", error);
    return {
      success: false,
      message: "An error occurred while creating the investment account",
    };
  }
}
