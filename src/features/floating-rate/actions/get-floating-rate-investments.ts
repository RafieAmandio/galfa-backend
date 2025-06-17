"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getFloatingRateGrowthPercentage } from "./get-floating-rate-growth-percentage";
import { startOfMonth } from "date-fns";

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  growthPercentage: number;
  performancePercentage: number;
  appliedRule: string;
}

interface FloatingRateInvestmentsResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestment[];
    totalGrossCapital: number;
    totalNetCapital: number;
    totalAdminFees: number;
    activeAccountsCount: number;
  };
}

/**
 * Get all floating rate investments for admin view
 */
export async function getFloatingRateInvestments(): Promise<FloatingRateInvestmentsResult> {
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
    // Get all floating rate accounts with related information
    const results = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        isRollover: accounts.is_rollover,
        rolloverSequence: accounts.rollover_sequence,
        createdAt: accounts.created_at,
        // Floating rate specific fields
        adminFee: floatingRateAccounts.admin_fee,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .orderBy(accounts.transaction_date);

    // Get current growth rate data for current month
    const currentMonth = startOfMonth(new Date());
    const growthRateResult = await getFloatingRateGrowthPercentage(
      currentMonth
    );
    const defaultGrowthData = {
      growthPercentage: 0,
      performancePercentage: 0,
      appliedRule: "No data available",
    };

    const growthData = growthRateResult.success
      ? {
          growthPercentage: growthRateResult.data!.growthPercentage,
          performancePercentage: growthRateResult.data!.performancePercentage,
          appliedRule: growthRateResult.data!.calculation.rule,
        }
      : defaultGrowthData;

    let totalGrossCapital = 0;
    let totalNetCapital = 0;
    let totalAdminFees = 0;

    // Process and calculate totals
    const investments: FloatingRateInvestment[] = results.map((result) => {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netCapital = grossCapital - adminFeeAmount;

      totalGrossCapital += grossCapital;
      totalNetCapital += netCapital;
      totalAdminFees += adminFeeAmount;

      return {
        id: result.id,
        accountNumber: result.accountNumber,
        investorEmail: result.investorEmail || "N/A",
        grossCapital,
        adminFee: adminFeeAmount,
        netCapital,
        transactionDate: result.transactionDate,
        endDate: result.endDate,
        status: result.status,
        isRollover: result.isRollover || false,
        rolloverSequence: result.rolloverSequence || 0,
        createdAt: result.createdAt,
        growthPercentage: growthData.growthPercentage,
        performancePercentage: growthData.performancePercentage,
        appliedRule: growthData.appliedRule,
      };
    });

    return {
      success: true,
      message: `Successfully retrieved ${investments.length} floating rate investments`,
      data: {
        investments,
        totalGrossCapital,
        totalNetCapital,
        totalAdminFees,
        activeAccountsCount: investments.filter(
          (inv) => inv.status === "active"
        ).length,
      },
    };
  } catch (error) {
    console.error("Get floating rate investments error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving floating rate investments",
    };
  }
}
