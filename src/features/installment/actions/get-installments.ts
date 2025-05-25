"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export interface InstallmentInvestment {
  name: string;
  capital: number;
  transDate: Date;
  periodMonths: number;
  endDate: Date;
  monthlyRate: number;
  monthlyPrinciple: number;
  monthlyCoF: number;
  monthlyPayments: {
    [key: string]: number; // Format: "MMM YYYY" (e.g., "Jan 2025")
  };
}

export async function getInstallmentInvestments(): Promise<
  InstallmentInvestment[]
> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      name: accounts.account_number,
      capital: accounts.capital,
      transDate: accounts.transaction_date,
      periodMonths: installmentAccounts.period_months,
      endDate: accounts.end_date,
      monthlyRate: installmentAccounts.monthly_rate,
      monthlyPrinciple: installmentAccounts.monthly_principle,
      monthlyCoF: installmentAccounts.monthly_cof,
    })
    .from(accounts)
    .innerJoin(
      installmentAccounts,
      eq(accounts.id, installmentAccounts.account_id)
    )
    .where(eq(accounts.status, "active"));

  return results.map((result) => {
    const monthlyPrinciple = Number(result.monthlyPrinciple);
    const monthlyCoF = Number(result.monthlyCoF);

    return {
      name: result.name,
      capital: Number(result.capital),
      transDate: result.transDate,
      periodMonths: result.periodMonths,
      endDate: result.endDate!,
      monthlyRate: Number(result.monthlyRate),
      monthlyPrinciple,
      monthlyCoF,
      monthlyPayments: calculateMonthlyPayments({
        transDate: result.transDate,
        periodMonths: result.periodMonths,
        monthlyPrinciple,
        monthlyCoF,
      }),
    };
  });
}

function calculateMonthlyPayments(result: {
  transDate: Date;
  periodMonths: number;
  monthlyPrinciple: number;
  monthlyCoF: number;
}): { [key: string]: number } {
  const payments: { [key: string]: number } = {};
  const startDate = new Date(result.transDate);

  for (let i = 0; i < result.periodMonths; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setMonth(startDate.getMonth() + i + 1);

    const monthKey = paymentDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    payments[monthKey] = result.monthlyPrinciple + result.monthlyCoF;
  }

  return payments;
}
