"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  fixRateAccounts,
  accountTypes,
  profiles,
  authUsers,
  mutations,
} from "@/db/drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
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

export async function getMaturedAccountsForFloatingRollover(): Promise<{
  success: boolean;
  message: string;
  accounts?: Array<{
    id: number;
    accountNumber: string;
    investorEmail: string | null;
    investorName: string | null;
    grossCapital: string;
    transactionDate: Date;
    endDate: Date | null;
    status: string;
    maturedValue: number;
    isRollover: boolean | null;
    accountType: "fixed" | "floating";
  }>;
}> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return { success: false, message: "Unauthorized: Admin access required" };
  }

  const db = createDrizzleConnection();

  try {
    const maturedAccounts = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        investorName: profiles.full_name,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
        fixAnnualRate: fixRateAccounts.annual_rate,
        fixAdminFee: fixRateAccounts.admin_fee,
        floatingAdminFee: floatingRateAccounts.admin_fee,
      })
      .from(accounts)
      .leftJoin(
        fixRateAccounts,
        eq(accounts.id, fixRateAccounts.account_id)
      )
      .leftJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(
        and(
          eq(accounts.status, "mature"),
          isNull(accounts.parent_account_id)
        )
      )
      .orderBy(accounts.end_date);

    const { calculateFloatingRateValueWithRedemptions } = await import(
      "@/lib/utils/floating-rate-calculator-with-redemptions"
    );
    const { calculateNetPresentValueWithRedemptions } = await import(
      "@/lib/utils/npv-calculator-with-redemptions"
    );

    const accountsWithMaturedValue = await Promise.all(
      maturedAccounts.map(async (account) => {
        const isFixedRate = account.fixAnnualRate !== null;
        const accountType: "fixed" | "floating" = isFixedRate
          ? "fixed"
          : "floating";

        if (!account.endDate) {
          return {
            id: account.id,
            accountNumber: account.accountNumber,
            investorEmail: account.investorEmail,
            investorName: account.investorName,
            grossCapital: account.grossCapital,
            transactionDate: account.transactionDate,
            endDate: account.endDate,
            status: account.status,
            isRollover: account.isRollover,
            maturedValue: parseFloat(account.grossCapital),
            accountType,
          };
        }

        try {
          let maturedValue: number;

          if (isFixedRate) {
            const npvResult = await calculateNetPresentValueWithRedemptions(
              account.id,
              parseFloat(account.grossCapital),
              parseFloat(account.fixAnnualRate!),
              account.transactionDate,
              account.endDate,
              account.isRollover || false,
              account.adminFeeApplied !== false,
              undefined,
              Number(account.fixAdminFee || 0)
            );
            maturedValue = npvResult.currentValue;
          } else {
            const netInvestorFund =
              parseFloat(account.grossCapital) -
              parseFloat(account.floatingAdminFee || "0");
            const result = await calculateFloatingRateValueWithRedemptions(
              account.id,
              netInvestorFund,
              account.transactionDate,
              account.endDate
            );
            maturedValue = result.currentValue;
          }

          return {
            id: account.id,
            accountNumber: account.accountNumber,
            investorEmail: account.investorEmail,
            investorName: account.investorName,
            grossCapital: account.grossCapital,
            transactionDate: account.transactionDate,
            endDate: account.endDate,
            status: account.status,
            isRollover: account.isRollover,
            maturedValue,
            accountType,
          };
        } catch (error) {
          console.error(
            `Error calculating matured value for account ${account.id}:`,
            error
          );
          return {
            id: account.id,
            accountNumber: account.accountNumber,
            investorEmail: account.investorEmail,
            investorName: account.investorName,
            grossCapital: account.grossCapital,
            transactionDate: account.transactionDate,
            endDate: account.endDate,
            status: account.status,
            isRollover: account.isRollover,
            maturedValue: parseFloat(account.grossCapital),
            accountType,
          };
        }
      })
    );

    return {
      success: true,
      message: "Matured accounts retrieved successfully",
      accounts: accountsWithMaturedValue,
    };
  } catch (error) {
    console.error("Get matured accounts for rollover error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving matured accounts",
    };
  }
}

export async function validateParentAccountForRollover(
  parentAccountId: number
): Promise<{ valid: boolean; message: string }> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return { valid: false, message: "Unauthorized: Admin access required" };
  }

  const db = createDrizzleConnection();

  try {
    const parentAccount = await db
      .select({
        id: accounts.id,
        status: accounts.status,
      })
      .from(accounts)
      .where(eq(accounts.id, parentAccountId))
      .limit(1);

    if (parentAccount.length === 0) {
      return { valid: false, message: "Parent account not found" };
    }

    if (parentAccount[0].status !== "mature") {
      return {
        valid: false,
        message: `Parent account status is "${parentAccount[0].status}" — only mature accounts can be rolled over`,
      };
    }

    return { valid: true, message: "Parent account is valid for rollover" };
  } catch (error) {
    console.error("Validate parent account for rollover error:", error);
    return { valid: false, message: "An error occurred during validation" };
  }
}
