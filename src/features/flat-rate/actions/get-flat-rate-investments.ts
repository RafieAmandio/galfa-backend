"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export interface FlatRateInvestment {
  name: string;
  capital: number;
  rate: number;
  transDate: Date;
  endDate: Date;
  annualizedCoF: number;
  monthlyRates: {
    [key: string]: number;
  };
}

export async function getFlatRateInvestments(): Promise<FlatRateInvestment[]> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      name: accounts.account_number,
      capital: accounts.capital,
      rate: fixRateAccounts.annual_rate,
      transDate: accounts.transaction_date,
      endDate: accounts.end_date,
      monthlyRate: fixRateAccounts.monthly_rate,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(eq(accounts.status, "active"));

  return results.map((result) => ({
    name: result.name,
    capital: Number(result.capital),
    rate: Number((Number(result.rate) * 100).toFixed(2)),
    transDate: result.transDate,
    endDate: result.endDate!,
    annualizedCoF: Number(result.capital) * Number(result.rate),
    monthlyRates: calculateMonthlyRates(result),
  }));
}

function calculateMonthlyRates(result: {
  transDate: Date;
  monthlyRate: string;
}): { [key: string]: number } {
  const rates: { [key: string]: number } = {};
  const startDate = new Date(result.transDate);
  const monthlyRate = Number(result.monthlyRate);

  for (let i = 0; i < 12; i++) {
    const rateDate = new Date(startDate);
    rateDate.setMonth(startDate.getMonth() + i);

    const monthKey = rateDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    rates[monthKey] = monthlyRate;
  }

  return rates;
}
