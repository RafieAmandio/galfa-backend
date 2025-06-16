"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  accountTypes,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";

interface CreateFlatRateAccountRequest {
  investorEmail: string;
  accountNumber: string;
  capital: number;
  annualRate: number;
  transactionDate: Date;
  endDate: Date;
  isRollover?: boolean;
  parentAccountId?: number;
  description?: string;
}

interface CreateFlatRateAccountResult {
  success: boolean;
  message: string;
  accountId?: number;
  accountNumber?: string;
  adminFee?: number;
  netCapital?: number;
}

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Get list of all investors for admin to select from
 */
export async function getAllInvestors(): Promise<InvestorOption[]> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const db = createDrizzleConnection();

  const results = await db
    .select({
      id: profiles.id,
      email: authUsers.email,
      fullName: profiles.full_name,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .orderBy(authUsers.email);

  return results
    .filter((result) => result.email !== null)
    .map((result) => ({
      id: result.id,
      email: result.email!,
      fullName: result.fullName,
    }));
}

/**
 * Check if account number is unique
 */
async function isAccountNumberUnique(accountNumber: string): Promise<boolean> {
  const db = createDrizzleConnection();

  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.account_number, accountNumber))
    .limit(1);

  return existingAccount.length === 0;
}

/**
 * Get or create the flat-rate account type
 */
async function getFlatRateAccountTypeId(): Promise<number> {
  const db = createDrizzleConnection();

  // First try to find existing flat-rate account type
  const existingType = await db
    .select({ id: accountTypes.id })
    .from(accountTypes)
    .where(eq(accountTypes.name, "fix"))
    .limit(1);

  if (existingType.length > 0) {
    return existingType[0].id;
  }

  // Create flat-rate account type if it doesn't exist
  const newType = await db
    .insert(accountTypes)
    .values({
      name: "fix",
      description:
        "Fixed annual rate investment accounts with monthly compounding",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning({ id: accountTypes.id });

  return newType[0].id;
}

/**
 * Create a new flat-rate investment account
 */
export async function createFlatRateAccount(
  request: CreateFlatRateAccountRequest
): Promise<CreateFlatRateAccountResult> {
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
      !request.annualRate
    ) {
      return {
        success: false,
        message:
          "Missing required fields: investor email, account number, capital, and annual rate are required",
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

    if (request.annualRate <= 0 || request.annualRate > 1) {
      return {
        success: false,
        message: "Annual rate must be between 0 and 1 (e.g., 0.17 for 17%)",
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
    const accountTypeId = await getFlatRateAccountTypeId();

    // Calculate admin fee and net capital
    const isRollover = request.isRollover || false;
    const adminFeeApplied = !isRollover; // Regular investments get admin fee, rollovers don't

    let adminFee = 0;
    let netCapital = request.capital;

    if (adminFeeApplied) {
      adminFee = request.capital * ADMIN_FEE_PERCENTAGE;
      netCapital = request.capital - adminFee;
    }

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
        is_rollover: isRollover,
        parent_account_id: request.parentAccountId || null,
        admin_fee_applied: adminFeeApplied,
        rollover_sequence: isRollover && request.parentAccountId ? 1 : null, // You might want to calculate this properly
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: accounts.id });

    const accountId = newAccount[0].id;

    // Create the fix rate account record
    await db.insert(fixRateAccounts).values({
      account_id: accountId,
      annual_rate: request.annualRate.toString(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      message: `Flat-rate investment account ${request.accountNumber} created successfully for ${request.investorEmail}`,
      accountId,
      accountNumber: request.accountNumber,
      adminFee,
      netCapital,
    };
  } catch (error) {
    console.error("Create flat-rate account error:", error);
    return {
      success: false,
      message: "An error occurred while creating the investment account",
    };
  }
}

/**
 * Validate parent account for rollover
 */
export async function validateParentAccount(parentAccountId: number): Promise<{
  valid: boolean;
  message: string;
  parentAccount?: any;
}> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      valid: false,
      message: "Unauthorized: Admin access required",
    };
  }

  const db = createDrizzleConnection();

  try {
    const parentAccount = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        capital: accounts.capital,
        status: accounts.status,
        endDate: accounts.end_date,
        userId: accounts.user_id,
        investorEmail: authUsers.email,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(accounts.id, parentAccountId))
      .limit(1);

    if (parentAccount.length === 0) {
      return {
        valid: false,
        message: "Parent account not found",
      };
    }

    const account = parentAccount[0];

    // Check if account can be used as parent (should be mature or closed)
    if (account.status === "active") {
      return {
        valid: false,
        message:
          "Cannot create rollover from active account. Account must be mature or closed first.",
      };
    }

    if (account.status !== "mature" && account.status !== "closed") {
      return {
        valid: false,
        message: `Cannot create rollover from ${account.status} account`,
      };
    }

    return {
      valid: true,
      message: "Parent account is valid for rollover",
      parentAccount: account,
    };
  } catch (error) {
    console.error("Validate parent account error:", error);
    return {
      valid: false,
      message: "An error occurred while validating parent account",
    };
  }
}
