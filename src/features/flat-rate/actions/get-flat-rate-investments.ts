"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface FlatRateInvestment {
  name: string;
  capital: number;
  rate: number;
  transDate: Date;
  endDate: Date;
  annualizedCoF: number;
  monthlyRates: {
    [key: string]: number; // Format: "MMM YYYY" (e.g., "Jan 2025")
  };
}

interface QueryResult {
  name: string;
  capital: string;
  rate: string;
  transDate: Date;
  endDate: Date | null;
  monthlyRate: string;
}

export async function getFlatRateInvestments(): Promise<FlatRateInvestment[]> {
  try {
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

    return results.map((result: QueryResult) => {
      const transDate = new Date(result.transDate);
      const endDate = new Date(result.endDate!);
      const monthlyRate = Number(result.monthlyRate);

      // Calculate prorated rates for each month
      const monthlyRates: Record<string, number> = {};
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Calculate rates for the year of transaction date
      months.forEach((month, index) => {
        const monthStart = new Date(transDate.getFullYear(), index, 1);
        const monthEnd = new Date(transDate.getFullYear(), index + 1, 0);

        // Skip months before transaction date or after end date
        if (monthEnd < transDate || monthStart > endDate) {
          monthlyRates[`${month} ${transDate.getFullYear()}`] = 0;
          return;
        }

        // Calculate days in month and days invested
        const daysInMonth = monthEnd.getDate();
        const startDay = monthStart < transDate ? transDate.getDate() : 1;
        const endDay = monthEnd > endDate ? endDate.getDate() : daysInMonth;
        let daysInvested = endDay - startDay + 1;

        // Subtract 1 day for the first month of investment
        if (
          monthStart.getMonth() === transDate.getMonth() &&
          monthStart.getFullYear() === transDate.getFullYear()
        ) {
          daysInvested -= 1;
        }

        // Calculate prorated rate
        const proratedRate = (monthlyRate * daysInvested) / daysInMonth;
        monthlyRates[`${month} ${transDate.getFullYear()}`] = Number(
          (proratedRate * 100).toFixed(2)
        );
      });

      // If end date is in a different year, calculate rates for that year too
      if (endDate.getFullYear() > transDate.getFullYear()) {
        months.forEach((month, index) => {
          const monthStart = new Date(endDate.getFullYear(), index, 1);
          const monthEnd = new Date(endDate.getFullYear(), index + 1, 0);

          // Skip months before transaction date or after end date
          if (monthEnd < transDate || monthStart > endDate) {
            monthlyRates[`${month} ${endDate.getFullYear()}`] = 0;
            return;
          }

          // Calculate days in month and days invested
          const daysInMonth = monthEnd.getDate();
          const startDay = monthStart < transDate ? transDate.getDate() : 1;
          const endDay = monthEnd > endDate ? endDate.getDate() : daysInMonth;
          let daysInvested = endDay - startDay + 1;

          // Subtract 1 day for the first month of investment
          if (
            monthStart.getMonth() === transDate.getMonth() &&
            monthStart.getFullYear() === transDate.getFullYear()
          ) {
            daysInvested -= 1;
          }

          // Calculate prorated rate
          const proratedRate = (monthlyRate * daysInvested) / daysInMonth;
          monthlyRates[`${month} ${endDate.getFullYear()}`] = Number(
            (proratedRate * 100).toFixed(2)
          );
        });
      }

      const returnData = {
        name: result.name,
        capital: Number(result.capital),
        rate: Number((Number(result.rate) * 100).toFixed(2)),
        transDate: result.transDate,
        endDate: result.endDate!,
        annualizedCoF: Number(result.capital) * Number(result.rate),
        monthlyRates,
      };

      return returnData;
    });
  } catch (error) {
    console.error("Error fetching flat rate investments:", error);
    throw new Error("Failed to fetch flat rate investments");
  }
}
