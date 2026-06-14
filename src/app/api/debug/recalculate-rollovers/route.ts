import { NextRequest, NextResponse } from "next/server";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("apply") !== "true";

  const db = createDrizzleConnection();

  const rollovers = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      parentAccountId: accounts.parent_account_id,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
    })
    .from(accounts)
    .where(eq(accounts.is_rollover, true))
    .orderBy(accounts.transaction_date);

  const allAccountIds = rollovers
    .map((r) => r.parentAccountId)
    .filter((id): id is number => id != null);
  const redemptionMap = await getBatchRedemptions(allAccountIds);

  const results: Array<{
    rolloverAccount: string;
    rolloverAccountId: number;
    parentAccountId: number;
    parentAccountNumber: string;
    parentType: string;
    currentCapital: number;
    recalculatedCapital: number;
    diff: number;
    updated: boolean;
  }> = [];

  for (const rollover of rollovers) {
    if (!rollover.parentAccountId) continue;

    const parentFixRate = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        capital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        annualRate: fixRateAccounts.annual_rate,
        adminFee: fixRateAccounts.admin_fee,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .where(eq(accounts.id, rollover.parentAccountId))
      .limit(1);

    if (parentFixRate.length > 0) {
      const parent = parentFixRate[0];
      if (!parent.endDate) continue;

      const npvResult = await calculateNetPresentValueWithRedemptions(
        parent.id,
        parseFloat(parent.capital),
        parseFloat(parent.annualRate),
        parent.transactionDate,
        parent.endDate,
        parent.isRollover || false,
        parent.adminFeeApplied !== false,
        redemptionMap.get(parent.id),
        Number(parent.adminFee || 0)
      );

      const currentCapital = parseFloat(rollover.capital);
      const recalculated = Math.round(npvResult.currentValue * 100) / 100;
      const diff = recalculated - currentCapital;

      let updated = false;
      if (!dryRun && Math.abs(diff) > 1) {
        await db
          .update(accounts)
          .set({ capital: recalculated.toString() })
          .where(eq(accounts.id, rollover.id));
        updated = true;
      }

      results.push({
        rolloverAccount: rollover.accountNumber,
        rolloverAccountId: rollover.id,
        parentAccountId: parent.id,
        parentAccountNumber: parent.accountNumber,
        parentType: "fix_rate",
        currentCapital,
        recalculatedCapital: recalculated,
        diff: Math.round(diff),
        updated,
      });
      continue;
    }

    const parentFloating = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        capital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        adminFee: floatingRateAccounts.admin_fee,
        isRollover: accounts.is_rollover,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .where(eq(accounts.id, rollover.parentAccountId))
      .limit(1);

    if (parentFloating.length > 0) {
      const parent = parentFloating[0];
      if (!parent.endDate) continue;

      const netInvestorFund =
        parseFloat(parent.capital) - parseFloat(parent.adminFee);
      const result = await calculateFloatingRateValueWithRedemptions(
        parent.id,
        netInvestorFund,
        parent.transactionDate,
        parent.endDate,
        redemptionMap.get(parent.id),
        undefined,
        parent.endDate
      );

      const currentCapital = parseFloat(rollover.capital);
      const recalculated = Math.round(result.currentValue * 100) / 100;
      const diff = recalculated - currentCapital;

      let updated = false;
      if (!dryRun && Math.abs(diff) > 1) {
        await db
          .update(accounts)
          .set({ capital: recalculated.toString() })
          .where(eq(accounts.id, rollover.id));
        updated = true;
      }

      results.push({
        rolloverAccount: rollover.accountNumber,
        rolloverAccountId: rollover.id,
        parentAccountId: parent.id,
        parentAccountNumber: parent.accountNumber,
        parentType: "floating_rate",
        currentCapital,
        recalculatedCapital: recalculated,
        diff: Math.round(diff),
        updated,
      });
    }
  }

  return NextResponse.json({
    dryRun,
    totalRollovers: results.length,
    withDiffs: results.filter((r) => Math.abs(r.diff) > 1).length,
    results: results.filter((r) => Math.abs(r.diff) > 1),
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apply = searchParams.get("apply") === "true";

  const corrections: Array<{ accountNumber: string; correctCapital: number }> =
    await request.json();

  if (!corrections || !Array.isArray(corrections)) {
    return NextResponse.json(
      { error: "Expected array of {accountNumber, correctCapital}" },
      { status: 400 }
    );
  }

  const db = createDrizzleConnection();
  const results = [];

  for (const c of corrections) {
    const [account] = await db
      .select({ id: accounts.id, capital: accounts.capital })
      .from(accounts)
      .where(eq(accounts.account_number, c.accountNumber))
      .limit(1);

    if (!account) {
      results.push({ accountNumber: c.accountNumber, status: "not_found" });
      continue;
    }

    const current = parseFloat(account.capital);
    const diff = c.correctCapital - current;

    if (apply && Math.abs(diff) > 1) {
      await db
        .update(accounts)
        .set({ capital: c.correctCapital.toString() })
        .where(eq(accounts.id, account.id));
      results.push({
        accountNumber: c.accountNumber,
        old: current,
        new: c.correctCapital,
        diff: Math.round(diff),
        status: "updated",
      });
    } else {
      results.push({
        accountNumber: c.accountNumber,
        old: current,
        new: c.correctCapital,
        diff: Math.round(diff),
        status: apply ? "no_change" : "dry_run",
      });
    }
  }

  return NextResponse.json({ apply, results });
}
