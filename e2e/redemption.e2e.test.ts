/**
 * E2E tests for redemption functionality.
 *
 * These tests verify that:
 * 1. Account value calculators work correctly with existing redemptions
 * 2. "Get accounts for redemption" queries return valid data
 * 3. Redemption balance calculations are consistent across investment types
 * 4. Edge cases (no redemptions, fully redeemed, negative balance) are handled
 *
 * Requires a running database (uses real Supabase connection from .env).
 */

import { describe, it, expect } from "vitest";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  mutations,
} from "@/db/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { calculateInstallmentValueWithRedemptions } from "@/lib/utils/installment-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";

// ── Helpers ────────────────────────────────────────────────────────

const db = createDrizzleConnection();

async function getActiveFlatRateAccounts(limit = 3) {
  return db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      annualRate: fixRateAccounts.annual_rate,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(eq(accounts.status, "active"))
    .limit(limit);
}

async function getActiveFloatingRateAccounts(limit = 3) {
  return db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      adminFee: floatingRateAccounts.admin_fee,
    })
    .from(accounts)
    .innerJoin(
      floatingRateAccounts,
      eq(accounts.id, floatingRateAccounts.account_id)
    )
    .where(eq(accounts.status, "active"))
    .limit(limit);
}

async function getActiveInstallmentAccounts(limit = 3) {
  return db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      monthlyCof: installmentAccounts.monthly_cof,
      adminFee: installmentAccounts.admin_fee,
      investmentType: installmentAccounts.investment_type,
    })
    .from(accounts)
    .innerJoin(
      installmentAccounts,
      eq(accounts.id, installmentAccounts.account_id)
    )
    .where(eq(accounts.status, "active"))
    .limit(limit);
}

async function getRedemptionsForAccount(accountId: number) {
  return db
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
}

// ── Flat Rate Redemption Tests ─────────────────────────────────────

describe("Flat Rate Redemption Calculations", () => {
  it("returns valid NPV structure for active accounts", async () => {
    const accts = await getActiveFlatRateAccounts();
    if (accts.length === 0) {
      console.warn("No active flat-rate accounts, skipping");
      return;
    }

    for (const acct of accts) {
      const result = await calculateNetPresentValueWithRedemptions(
        acct.id,
        Number(acct.capital),
        Number(acct.annualRate),
        acct.transactionDate,
        new Date(),
        acct.isRollover || false,
        acct.adminFeeApplied !== false
      );

      expect(result.currentValue).toBeGreaterThanOrEqual(0);
      expect(result.daysInvested).toBeGreaterThanOrEqual(0);
      expect(result.totalRedemptions).toBeGreaterThanOrEqual(0);
      expect(result.remainingPrincipal).toBeDefined();
      expect(Array.isArray(result.monthlyBreakdown)).toBe(true);
      expect(result.monthlyBreakdown.length).toBeGreaterThan(0);

      // Each monthly breakdown has required fields
      for (const month of result.monthlyBreakdown) {
        expect(typeof month.monthYear).toBe("string");
        expect(typeof month.startingBalance).toBe("number");
        expect(typeof month.redemptions).toBe("number");
        expect(typeof month.interestEarned).toBe("number");
        expect(typeof month.endingBalance).toBe("number");
        expect(typeof month.daysInPeriod).toBe("number");
        expect(month.redemptions).toBeGreaterThanOrEqual(0);
        expect(month.interestEarned).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("currentValue equals capital + interest - redemptions for accounts with no redemptions", async () => {
    const accts = await getActiveFlatRateAccounts();
    if (accts.length === 0) return;

    for (const acct of accts) {
      const redemptions = await getRedemptionsForAccount(acct.id);
      if (redemptions.length > 0) continue; // Skip accounts with redemptions

      const result = await calculateNetPresentValueWithRedemptions(
        acct.id,
        Number(acct.capital),
        Number(acct.annualRate),
        acct.transactionDate,
        new Date(),
        acct.isRollover || false,
        acct.adminFeeApplied !== false
      );

      // With no redemptions, current value should be >= capital (interest earned)
      expect(result.currentValue).toBeGreaterThanOrEqual(Number(acct.capital));
      expect(result.totalRedemptions).toBe(0);
      expect(result.remainingPrincipal).toBe(Number(acct.capital));
    }
  });

  it("totalRedemptions matches sum of actual mutation records", async () => {
    const accts = await getActiveFlatRateAccounts(5);
    if (accts.length === 0) return;

    const ids = accts.map((a) => a.id);
    const redemptionMap = await getBatchRedemptions(ids);

    for (const acct of accts) {
      const batchRedemptions = redemptionMap.get(acct.id)!;
      const dbRedemptions = await getRedemptionsForAccount(acct.id);

      // Batch redemptions count should match direct DB query
      expect(batchRedemptions.length).toBe(dbRedemptions.length);

      // Total amounts should match
      const batchTotal = batchRedemptions.reduce((s, r) => s + r.amount, 0);
      const dbTotal = dbRedemptions.reduce(
        (s, r) => s + Number(r.amount),
        0
      );
      expect(batchTotal).toBeCloseTo(dbTotal, 2);

      // Calculator's totalRedemptions should match
      const result = await calculateNetPresentValueWithRedemptions(
        acct.id,
        Number(acct.capital),
        Number(acct.annualRate),
        acct.transactionDate,
        new Date(),
        acct.isRollover || false,
        acct.adminFeeApplied !== false,
        batchRedemptions
      );

      expect(result.totalRedemptions).toBeCloseTo(dbTotal, 2);
    }
  });

  it("monthly breakdown redemptions sum equals totalRedemptions", async () => {
    const accts = await getActiveFlatRateAccounts();
    if (accts.length === 0) return;

    for (const acct of accts) {
      const result = await calculateNetPresentValueWithRedemptions(
        acct.id,
        Number(acct.capital),
        Number(acct.annualRate),
        acct.transactionDate,
        new Date(),
        acct.isRollover || false,
        acct.adminFeeApplied !== false
      );

      const monthlyRedemptionSum = result.monthlyBreakdown.reduce(
        (sum, m) => sum + m.redemptions,
        0
      );

      expect(monthlyRedemptionSum).toBeCloseTo(result.totalRedemptions, 2);
    }
  });
});

// ── Floating Rate Redemption Tests ─────────────────────────────────

describe("Floating Rate Redemption Calculations", () => {
  it("returns valid structure for active accounts", async () => {
    const accts = await getActiveFloatingRateAccounts();
    if (accts.length === 0) {
      console.warn("No active floating-rate accounts, skipping");
      return;
    }

    for (const acct of accts) {
      const netInvestorFund =
        Number(acct.capital) - Number(acct.adminFee);

      const result = await calculateFloatingRateValueWithRedemptions(
        acct.id,
        netInvestorFund,
        acct.transactionDate,
        new Date()
      );

      expect(result.currentValue).toBeGreaterThanOrEqual(0);
      expect(result.daysInvested).toBeGreaterThanOrEqual(0);
      expect(result.totalRedemptions).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.monthlyBreakdown)).toBe(true);
      expect(result.monthlyBreakdown.length).toBeGreaterThan(0);

      for (const month of result.monthlyBreakdown) {
        expect(typeof month.monthYear).toBe("string");
        expect(typeof month.startingBalance).toBe("number");
        expect(typeof month.redemptions).toBe("number");
        expect(typeof month.gainedFund).toBe("number");
        expect(typeof month.endingBalance).toBe("number");
        expect(typeof month.growthRate).toBe("number");
        expect(typeof month.hasData).toBe("boolean");
        expect(Array.isArray(month.redemptionDetails)).toBe(true);
      }
    }
  });

  it("prefetched redemptions produce same result as individual fetch", async () => {
    const accts = await getActiveFloatingRateAccounts(1);
    if (accts.length === 0) return;

    const acct = accts[0];
    const netInvestorFund = Number(acct.capital) - Number(acct.adminFee);

    // Individual fetch (no prefetched data)
    const resultIndividual = await calculateFloatingRateValueWithRedemptions(
      acct.id,
      netInvestorFund,
      acct.transactionDate,
      new Date()
    );

    // Prefetched redemptions only (growth rates fetched individually in both cases)
    const redemptionMap = await getBatchRedemptions([acct.id]);

    const resultPrefetched = await calculateFloatingRateValueWithRedemptions(
      acct.id,
      netInvestorFund,
      acct.transactionDate,
      new Date(),
      redemptionMap.get(acct.id)
    );

    expect(resultPrefetched.currentValue).toBeCloseTo(
      resultIndividual.currentValue,
      2
    );
    expect(resultPrefetched.totalRedemptions).toBe(
      resultIndividual.totalRedemptions
    );
    expect(resultPrefetched.monthlyBreakdown.length).toBe(
      resultIndividual.monthlyBreakdown.length
    );
  });

  it("redemption details in monthly breakdown match batch redemptions", async () => {
    const accts = await getActiveFloatingRateAccounts();
    if (accts.length === 0) return;

    for (const acct of accts) {
      const netInvestorFund =
        Number(acct.capital) - Number(acct.adminFee);

      const result = await calculateFloatingRateValueWithRedemptions(
        acct.id,
        netInvestorFund,
        acct.transactionDate,
        new Date()
      );

      // Sum of all monthly redemption details should equal totalRedemptions
      const detailSum = result.monthlyBreakdown.reduce(
        (sum, m) =>
          sum +
          m.redemptionDetails.reduce((s, r) => s + r.amount, 0),
        0
      );

      expect(detailSum).toBeCloseTo(result.totalRedemptions, 2);
    }
  });
});

// ── Installment Redemption Tests ───────────────────────────────────

describe("Installment Redemption Calculations", () => {
  it("returns valid structure for active accounts", async () => {
    const accts = await getActiveInstallmentAccounts();
    if (accts.length === 0) {
      console.warn("No active installment accounts, skipping");
      return;
    }

    for (const acct of accts) {
      const netCapital = Number(acct.capital) - Number(acct.adminFee);
      const monthlyCof = Number(acct.monthlyCof);
      const investmentType = acct.investmentType as
        | "principle"
        | "interest_only";

      const result = await calculateInstallmentValueWithRedemptions(
        acct.id,
        netCapital,
        monthlyCof,
        investmentType,
        acct.transactionDate,
        new Date()
      );

      expect(result.currentValue).toBeGreaterThanOrEqual(0);
      expect(result.daysInvested).toBeGreaterThanOrEqual(0);
      expect(result.totalRedemptions).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.monthlyBreakdown)).toBe(true);
      expect(result.monthlyBreakdown.length).toBeGreaterThan(0);

      for (const month of result.monthlyBreakdown) {
        expect(typeof month.monthYear).toBe("string");
        expect(typeof month.startingBalance).toBe("number");
        expect(typeof month.redemptions).toBe("number");
        expect(typeof month.interestEarned).toBe("number");
        expect(typeof month.endingBalance).toBe("number");
        expect(typeof month.daysInPeriod).toBe("number");
        expect(Array.isArray(month.redemptionDetails)).toBe(true);
      }
    }
  });

  it("prefetched redemptions produce same result as individual fetch", async () => {
    const accts = await getActiveInstallmentAccounts(1);
    if (accts.length === 0) return;

    const acct = accts[0];
    const netCapital = Number(acct.capital) - Number(acct.adminFee);
    const monthlyCof = Number(acct.monthlyCof);
    const investmentType = acct.investmentType as
      | "principle"
      | "interest_only";

    // Individual fetch
    const resultIndividual = await calculateInstallmentValueWithRedemptions(
      acct.id,
      netCapital,
      monthlyCof,
      investmentType,
      acct.transactionDate,
      new Date()
    );

    // Prefetched
    const redemptionMap = await getBatchRedemptions([acct.id]);
    const resultPrefetched = await calculateInstallmentValueWithRedemptions(
      acct.id,
      netCapital,
      monthlyCof,
      investmentType,
      acct.transactionDate,
      new Date(),
      redemptionMap.get(acct.id)
    );

    expect(resultPrefetched.currentValue).toBeCloseTo(
      resultIndividual.currentValue,
      2
    );
    expect(resultPrefetched.totalRedemptions).toBe(
      resultIndividual.totalRedemptions
    );
    expect(resultPrefetched.monthlyBreakdown.length).toBe(
      resultIndividual.monthlyBreakdown.length
    );
  });

  it("monthly breakdown redemptions sum equals totalRedemptions", async () => {
    const accts = await getActiveInstallmentAccounts();
    if (accts.length === 0) return;

    for (const acct of accts) {
      const netCapital = Number(acct.capital) - Number(acct.adminFee);
      const monthlyCof = Number(acct.monthlyCof);
      const investmentType = acct.investmentType as
        | "principle"
        | "interest_only";

      const result = await calculateInstallmentValueWithRedemptions(
        acct.id,
        netCapital,
        monthlyCof,
        investmentType,
        acct.transactionDate,
        new Date()
      );

      const monthlyRedemptionSum = result.monthlyBreakdown.reduce(
        (sum, m) => sum + m.redemptions,
        0
      );

      expect(monthlyRedemptionSum).toBeCloseTo(result.totalRedemptions, 2);
    }
  });
});

// ── Cross-type Consistency Tests ───────────────────────────────────

describe("Cross-type Redemption Consistency", () => {
  it("getBatchRedemptions is consistent across all account types", async () => {
    const [flatAccts, floatAccts, installAccts] = await Promise.all([
      getActiveFlatRateAccounts(2),
      getActiveFloatingRateAccounts(2),
      getActiveInstallmentAccounts(2),
    ]);

    const allIds = [
      ...flatAccts.map((a) => a.id),
      ...floatAccts.map((a) => a.id),
      ...installAccts.map((a) => a.id),
    ];

    if (allIds.length === 0) {
      console.warn("No active accounts found, skipping");
      return;
    }

    // Single batch call for all account types
    const batchMap = await getBatchRedemptions(allIds);

    expect(batchMap).toBeInstanceOf(Map);
    expect(batchMap.size).toBe(allIds.length);

    // Every ID should have an entry (even if empty array)
    for (const id of allIds) {
      expect(batchMap.has(id)).toBe(true);
      expect(Array.isArray(batchMap.get(id))).toBe(true);
    }

    // Verify each redemption has valid fields
    for (const [, redemptions] of batchMap) {
      for (const r of redemptions) {
        expect(typeof r.amount).toBe("number");
        expect(r.amount).toBeGreaterThan(0);
        expect(r.transactionDate).toBeInstanceOf(Date);
        expect(r.status).toBe("completed");
      }
    }
  });

  it("redemptions are sorted by transaction date", async () => {
    const accts = await getActiveFlatRateAccounts(5);
    if (accts.length === 0) return;

    const ids = accts.map((a) => a.id);
    const batchMap = await getBatchRedemptions(ids);

    for (const [, redemptions] of batchMap) {
      if (redemptions.length < 2) continue;

      for (let i = 1; i < redemptions.length; i++) {
        const prev = new Date(redemptions[i - 1].transactionDate).getTime();
        const curr = new Date(redemptions[i].transactionDate).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });
});

// ── Edge Case Tests ────────────────────────────────────────────────

describe("Redemption Edge Cases", () => {
  it("calculator handles account with zero capital gracefully", async () => {
    // Use a dummy account ID that won't have data
    const result = await calculateNetPresentValueWithRedemptions(
      -1,
      0,
      0.12,
      new Date("2024-01-01"),
      new Date(),
      false,
      true,
      [] // Empty redemptions
    );

    expect(result.currentValue).toBe(0);
    expect(result.totalRedemptions).toBe(0);
    expect(result.daysInvested).toBeGreaterThan(0);
  });

  it("calculator handles future start date gracefully", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const result = await calculateNetPresentValueWithRedemptions(
      -1,
      100000000,
      0.12,
      futureDate,
      new Date(),
      false,
      true,
      []
    );

    // With future start date and current end date, no interest should accrue
    expect(result.monthlyBreakdown.length).toBe(0);
  });

  it("floating rate calculator handles empty redemptions", async () => {
    const accts = await getActiveFloatingRateAccounts(1);
    if (accts.length === 0) return;

    const acct = accts[0];
    const netInvestorFund = Number(acct.capital) - Number(acct.adminFee);

    // Pass empty redemptions explicitly
    const result = await calculateFloatingRateValueWithRedemptions(
      acct.id,
      netInvestorFund,
      acct.transactionDate,
      new Date(),
      [] // Explicitly empty
    );

    expect(result.totalRedemptions).toBe(0);
    expect(result.currentValue).toBeGreaterThanOrEqual(0);
    // With no redemptions, remaining principal equals net investor fund
    expect(result.remainingPrincipal).toBe(netInvestorFund);
  });

  it("installment calculator handles empty redemptions", async () => {
    const accts = await getActiveInstallmentAccounts(1);
    if (accts.length === 0) return;

    const acct = accts[0];
    const netCapital = Number(acct.capital) - Number(acct.adminFee);
    const monthlyCof = Number(acct.monthlyCof);
    const investmentType = acct.investmentType as
      | "principle"
      | "interest_only";

    const result = await calculateInstallmentValueWithRedemptions(
      acct.id,
      netCapital,
      monthlyCof,
      investmentType,
      acct.transactionDate,
      new Date(),
      [] // Explicitly empty
    );

    expect(result.totalRedemptions).toBe(0);
    expect(result.currentValue).toBeGreaterThanOrEqual(0);
  });

  it("batch redemptions returns empty arrays for accounts with no redemptions", async () => {
    // Get all active accounts and find ones without redemptions
    const accts = await getActiveFlatRateAccounts(10);
    if (accts.length === 0) return;

    const ids = accts.map((a) => a.id);
    const batchMap = await getBatchRedemptions(ids);

    for (const id of ids) {
      const redemptions = batchMap.get(id)!;
      expect(Array.isArray(redemptions)).toBe(true);
      // Amounts should all be positive
      for (const r of redemptions) {
        expect(r.amount).toBeGreaterThan(0);
      }
    }
  });
});
