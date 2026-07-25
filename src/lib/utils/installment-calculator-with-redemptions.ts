import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  format,
  differenceInMonths,
} from "date-fns";
import type { Redemption as BatchRedemption } from "./batch-redemptions";

export interface Redemption {
  amount: number;
  transactionDate: Date;
  status: string;
}

export interface InstallmentValueWithRedemptions {
  currentValue: number;
  daysInvested: number;
  totalRedemptions: number;
  remainingPrincipal: number;
  monthlyBreakdown: MonthlyInstallmentCalculation[];
}

export interface MonthlyInstallmentCalculation {
  monthYear: string;
  startingBalance: number;
  redemptions: number;
  interestEarned: number;
  endingBalance: number;
  daysInPeriod: number;
  redemptionDetails: Redemption[];
}

async function getAccountRedemptions(accountId: number): Promise<Redemption[]> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      amount: mutations.amount,
      transactionDate: mutations.transaction_date,
      status: mutations.status,
    })
    .from(mutations)
    .where(
      and(
        eq(mutations.account_id, accountId),
        eq(mutations.type, "redemption"),
        eq(mutations.status, "completed")
      )
    )
    .orderBy(mutations.transaction_date);

  return results.map((result) => ({
    amount: Number(result.amount),
    transactionDate: result.transactionDate,
    status: result.status,
  }));
}

type InstallmentType = "principle" | "interest_only" | "bullet" | "declining";

function computeInstallmentValue(
  netCapital: number,
  monthlyCof: number,
  investmentType: InstallmentType,
  startDate: Date,
  currentDate: Date,
  redemptions: Redemption[]
): InstallmentValueWithRedemptions {
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  let currentValue = netCapital;
  let calculationDate = new Date(startDate);
  const endDate = currentDate;
  const monthlyBreakdown: MonthlyInstallmentCalculation[] = [];

  const daysInvested = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const durationMonths = differenceInMonths(endDate, startDate) + 1;

  const monthlyPrincipalPayment =
    investmentType === "principle" || investmentType === "declining"
      ? netCapital / durationMonths
      : 0;

  let remainingPrincipal = netCapital;

  while (calculationDate <= endDate) {
    const monthStart = new Date(calculationDate);
    const monthEnd = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      0
    );
    const actualEndDate = monthEnd > endDate ? endDate : monthEnd;

    let daysInPeriod = Math.ceil(
      (actualEndDate.getTime() - calculationDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const isStartMonth = calculationDate.getTime() === startDate.getTime();
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    if (!isStartMonth && !isEndMonth) {
      daysInPeriod += 1;
    }

    const startingBalance = currentValue;

    const redemptionsInPeriod = redemptions.filter((r) => {
      const redemptionDate = new Date(r.transactionDate);
      return redemptionDate >= monthStart && redemptionDate <= actualEndDate;
    });

    let redemptionsThisMonth = 0;
    let balanceAfterRedemptions = currentValue;

    redemptionsInPeriod.forEach((redemption) => {
      redemptionsThisMonth += redemption.amount;
      balanceAfterRedemptions -= redemption.amount;
      if (balanceAfterRedemptions < 0) {
        balanceAfterRedemptions = 0;
      }
    });

    const isFullyRedeemed =
      balanceAfterRedemptions < 1000 && redemptionsThisMonth > 0;

    let interestEarned = 0;

    if (investmentType === "principle") {
      interestEarned = netCapital * monthlyCof;
    } else if (investmentType === "interest_only") {
      interestEarned = remainingPrincipal * monthlyCof;
    } else if (investmentType === "bullet") {
      interestEarned = 0;
    } else if (investmentType === "declining") {
      interestEarned = remainingPrincipal * monthlyCof;
    }

    if (investmentType === "principle" || investmentType === "declining") {
      remainingPrincipal = Math.max(
        0,
        remainingPrincipal - monthlyPrincipalPayment
      );
    }

    currentValue = balanceAfterRedemptions + interestEarned;

    const monthKey = format(calculationDate, "MMMM yyyy");

    monthlyBreakdown.push({
      monthYear: monthKey,
      startingBalance,
      redemptions: redemptionsThisMonth,
      interestEarned,
      endingBalance: currentValue,
      daysInPeriod,
      redemptionDetails: redemptionsInPeriod,
    });

    if (isFullyRedeemed) {
      currentValue = 0;
      break;
    }

    calculationDate = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      1
    );
  }

  return {
    currentValue,
    daysInvested,
    totalRedemptions,
    remainingPrincipal,
    monthlyBreakdown,
  };
}

export async function calculateInstallmentValueWithRedemptions(
  accountId: number,
  netCapital: number,
  monthlyCof: number,
  investmentType: InstallmentType,
  startDate: Date,
  currentDate: Date = new Date(),
  prefetchedRedemptions?: BatchRedemption[]
): Promise<InstallmentValueWithRedemptions> {
  const redemptions = prefetchedRedemptions ?? await getAccountRedemptions(accountId);
  return computeInstallmentValue(netCapital, monthlyCof, investmentType, startDate, currentDate, redemptions);
}

export function calculateInstallmentValueWithKnownRedemptions(
  netCapital: number,
  monthlyCof: number,
  investmentType: InstallmentType,
  startDate: Date,
  currentDate: Date = new Date(),
  redemptions: Redemption[] = []
): InstallmentValueWithRedemptions {
  return computeInstallmentValue(netCapital, monthlyCof, investmentType, startDate, currentDate, redemptions);
}
