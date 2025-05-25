"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface PrincipleFixRateResult {
  totalCapital: number;
  totalCoF: number;
}

export async function getPrincipleFixRate(): Promise<PrincipleFixRateResult> {
  try {
    const db = createDrizzleConnection();

    // Get all active fix rate accounts
    const results = await db
      .select({
        capital: accounts.capital,
        annualRate: fixRateAccounts.annual_rate,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .where(eq(accounts.status, "active"));

    // Calculate total capital and CoF
    const totalCapital = results.reduce(
      (sum, result) => sum + Number(result.capital),
      0
    );
    const totalCoF = results.reduce(
      (sum, result) => sum + Number(result.capital) * Number(result.annualRate),
      0
    );

    return {
      totalCapital,
      totalCoF,
    };
  } catch (error) {
    console.error("Error fetching principle fix rate:", error);
    throw new Error("Failed to fetch principle fix rate");
  }
}
