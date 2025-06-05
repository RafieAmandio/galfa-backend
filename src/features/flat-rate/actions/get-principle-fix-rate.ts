"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";

interface PrincipleFixRateResult {
  totalGrossCapital: number;
  totalAdminFee: number;
  totalNetCapital: number;
  totalCoF: number;
  adminFeePercentage: number;
}

export async function getPrincipleFixRate(): Promise<PrincipleFixRateResult> {
  try {
    const db = createDrizzleConnection();

    // Get all active fix rate accounts
    const results = await db
      .select({
        grossCapital: accounts.capital, // Full capital from database
        annualRate: fixRateAccounts.annual_rate,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .where(eq(accounts.status, "active"));

    // Calculate totals with backend admin fee application
    const totalGrossCapital = results.reduce(
      (sum, result) => sum + Number(result.grossCapital),
      0
    );

    const totalAdminFee = totalGrossCapital * ADMIN_FEE_PERCENTAGE;
    const totalNetCapital = totalGrossCapital - totalAdminFee;

    // Calculate total CoF based on net capital (after admin fee)
    const totalCoF = results.reduce((sum, result) => {
      const grossCapital = Number(result.grossCapital);
      const adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
      const netCapital = grossCapital - adminFee;
      return sum + netCapital * Number(result.annualRate);
    }, 0);

    return {
      totalGrossCapital,
      totalAdminFee,
      totalNetCapital,
      totalCoF,
      adminFeePercentage: ADMIN_FEE_PERCENTAGE,
    };
  } catch (error) {
    console.error("Error fetching principle fix rate:", error);
    throw new Error("Failed to fetch principle fix rate");
  }
}
