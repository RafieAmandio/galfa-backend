/**
 * E2E tests for batch query optimization.
 *
 * These tests verify that the batch-optimized query functions
 * return correct data structures and that pre-fetched data
 * produces consistent results with the individual-fetch path.
 *
 * Requires a running database (uses real Supabase connection from .env).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { calculateInstallmentValueWithRedemptions } from "@/lib/utils/installment-calculator-with-redemptions";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { subMonths, startOfMonth } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────────

async function getFixRateAccountSample() {
  const db = createDrizzleConnection();
  const results = await db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      annualRate: fixRateAccounts.annual_rate,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(eq(accounts.status, "active"))
    .limit(3);
  return results;
}

async function getFloatingRateAccountSample() {
  const db = createDrizzleConnection();
  const results = await db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
      adminFee: floatingRateAccounts.admin_fee,
    })
    .from(accounts)
    .innerJoin(
      floatingRateAccounts,
      eq(accounts.id, floatingRateAccounts.account_id)
    )
    .where(eq(accounts.status, "active"))
    .limit(3);
  return results;
}

async function getInstallmentAccountSample() {
  const db = createDrizzleConnection();
  const results = await db
    .select({
      id: accounts.id,
      capital: accounts.capital,
      transactionDate: accounts.transaction_date,
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
    .limit(3);
  return results;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Batch Redemptions", () => {
  it("returns a Map with an entry for every requested account ID", async () => {
    const sampleAccounts = await getFixRateAccountSample();
    if (sampleAccounts.length === 0) {
      console.warn("No active fix-rate accounts found, skipping test");
      return;
    }

    const ids = sampleAccounts.map((a) => a.id);
    const map = await getBatchRedemptions(ids);

    expect(map).toBeInstanceOf(Map);
    for (const id of ids) {
      expect(map.has(id)).toBe(true);
      expect(Array.isArray(map.get(id))).toBe(true);
    }
  });

  it("returns empty Map for empty input", async () => {
    const map = await getBatchRedemptions([]);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it("each redemption has required fields", async () => {
    const sampleAccounts = await getFixRateAccountSample();
    if (sampleAccounts.length === 0) return;

    const ids = sampleAccounts.map((a) => a.id);
    const map = await getBatchRedemptions(ids);

    for (const [, redemptions] of map) {
      for (const r of redemptions) {
        expect(typeof r.amount).toBe("number");
        expect(r.transactionDate).toBeInstanceOf(Date);
        expect(typeof r.status).toBe("string");
      }
    }
  });
});

describe("Batch Floating Rate Growth Percentages", () => {
  it("returns a Map with growth data for each month in range", async () => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 6);

    const map = await getBatchFloatingRateGrowthPercentages(startDate, endDate);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBeGreaterThanOrEqual(6);

    for (const [key, data] of map) {
      // Key should be yyyy-MM format
      expect(key).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof data.growthPercentage).toBe("number");
      expect(typeof data.performancePercentage).toBe("number");
      expect(typeof data.appliedRule).toBe("string");
      expect(typeof data.hasData).toBe("boolean");
    }
  });

  it("applies correct business rules", async () => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 3);

    const map = await getBatchFloatingRateGrowthPercentages(startDate, endDate);

    for (const [, data] of map) {
      if (data.hasData) {
        if (data.performancePercentage < 24) {
          // Growth should be performance / 12
          expect(data.growthPercentage).toBeCloseTo(
            data.performancePercentage / 12,
            10
          );
          expect(data.appliedRule).toBe("Performance < 24%");
        } else {
          // Growth should be fixed 1.42%
          expect(data.growthPercentage).toBe(1.42);
          expect(data.appliedRule).toBe("Performance ≥ 24%");
        }
      }
    }
  });
});

describe("NPV Calculator with pre-fetched redemptions", () => {
  it("produces same result with pre-fetched vs individual-fetch redemptions", async () => {
    const sampleAccounts = await getFixRateAccountSample();
    if (sampleAccounts.length === 0) {
      console.warn("No active fix-rate accounts found, skipping test");
      return;
    }

    const account = sampleAccounts[0];
    const grossCapital = Number(account.capital);
    const annualRate = Number(account.annualRate);
    const isRollover = account.isRollover || false;
    const adminFeeApplied = account.adminFeeApplied !== false;

    // Fetch redemptions via batch
    const redemptionMap = await getBatchRedemptions([account.id]);
    const prefetched = redemptionMap.get(account.id)!;

    // Calculate with individual fetch (no prefetched data)
    const resultIndividual = await calculateNetPresentValueWithRedemptions(
      account.id,
      grossCapital,
      annualRate,
      account.transactionDate,
      new Date(),
      isRollover,
      adminFeeApplied
    );

    // Calculate with pre-fetched data
    const resultPrefetched = await calculateNetPresentValueWithRedemptions(
      account.id,
      grossCapital,
      annualRate,
      account.transactionDate,
      new Date(),
      isRollover,
      adminFeeApplied,
      prefetched
    );

    // Results should be identical
    expect(resultPrefetched.currentValue).toBeCloseTo(
      resultIndividual.currentValue,
      2
    );
    expect(resultPrefetched.totalRedemptions).toBe(
      resultIndividual.totalRedemptions
    );
    expect(resultPrefetched.daysInvested).toBe(resultIndividual.daysInvested);
    expect(resultPrefetched.monthlyBreakdown.length).toBe(
      resultIndividual.monthlyBreakdown.length
    );
  });
});

describe("Floating Rate Calculator with pre-fetched data", () => {
  it("produces consistent result with pre-fetched redemptions", async () => {
    const sampleAccounts = await getFloatingRateAccountSample();
    if (sampleAccounts.length === 0) {
      console.warn("No active floating-rate accounts found, skipping test");
      return;
    }

    const account = sampleAccounts[0];
    const grossCapital = Number(account.capital);
    const adminFee = Number(account.adminFee);
    const netInvestorFund = grossCapital - adminFee;

    // Fetch redemptions via batch
    const redemptionMap = await getBatchRedemptions([account.id]);
    const prefetched = redemptionMap.get(account.id)!;

    // Calculate with individual fetch
    const resultIndividual = await calculateFloatingRateValueWithRedemptions(
      account.id,
      netInvestorFund,
      account.transactionDate,
      new Date()
    );

    // Calculate with pre-fetched redemptions (but NOT growth rates,
    // so growth rates still fetched individually - tests redemption batching)
    const resultPrefetched = await calculateFloatingRateValueWithRedemptions(
      account.id,
      netInvestorFund,
      account.transactionDate,
      new Date(),
      prefetched
    );

    // Redemptions should match exactly
    expect(resultPrefetched.totalRedemptions).toBe(
      resultIndividual.totalRedemptions
    );
    expect(resultPrefetched.daysInvested).toBe(resultIndividual.daysInvested);
    // Current value should be very close (same redemptions, same growth rates)
    expect(resultPrefetched.currentValue).toBeCloseTo(
      resultIndividual.currentValue,
      2
    );
  });

  it("produces result with both pre-fetched redemptions and growth rates", async () => {
    const sampleAccounts = await getFloatingRateAccountSample();
    if (sampleAccounts.length === 0) {
      console.warn("No active floating-rate accounts found, skipping test");
      return;
    }

    const account = sampleAccounts[0];
    const grossCapital = Number(account.capital);
    const adminFee = Number(account.adminFee);
    const netInvestorFund = grossCapital - adminFee;

    // Fetch both batches
    const [redemptionMap, growthRatesMap] = await Promise.all([
      getBatchRedemptions([account.id]),
      getBatchFloatingRateGrowthPercentages(
        account.transactionDate,
        new Date()
      ),
    ]);

    const result = await calculateFloatingRateValueWithRedemptions(
      account.id,
      netInvestorFund,
      account.transactionDate,
      new Date(),
      redemptionMap.get(account.id),
      growthRatesMap
    );

    // Should return valid result
    expect(typeof result.currentValue).toBe("number");
    expect(result.currentValue).toBeGreaterThanOrEqual(0);
    expect(typeof result.daysInvested).toBe("number");
    expect(typeof result.totalRedemptions).toBe("number");
    expect(Array.isArray(result.monthlyBreakdown)).toBe(true);
    expect(result.monthlyBreakdown.length).toBeGreaterThan(0);

    // Each monthly breakdown should have required fields
    for (const month of result.monthlyBreakdown) {
      expect(typeof month.monthYear).toBe("string");
      expect(typeof month.startingBalance).toBe("number");
      expect(typeof month.gainedFund).toBe("number");
      expect(typeof month.endingBalance).toBe("number");
      expect(typeof month.growthRate).toBe("number");
      expect(typeof month.hasData).toBe("boolean");
    }
  });
});

describe("Installment Calculator with pre-fetched redemptions", () => {
  it("produces same result with pre-fetched vs individual-fetch redemptions", async () => {
    const sampleAccounts = await getInstallmentAccountSample();
    if (sampleAccounts.length === 0) {
      console.warn("No active installment accounts found, skipping test");
      return;
    }

    const account = sampleAccounts[0];
    const grossCapital = Number(account.capital);
    const adminFee = Number(account.adminFee);
    const netCapital = grossCapital - adminFee;
    const monthlyCof = Number(account.monthlyCof);
    const investmentType = account.investmentType as
      | "principle"
      | "interest_only";

    // Fetch redemptions via batch
    const redemptionMap = await getBatchRedemptions([account.id]);
    const prefetched = redemptionMap.get(account.id)!;

    // Calculate with individual fetch
    const resultIndividual = await calculateInstallmentValueWithRedemptions(
      account.id,
      netCapital,
      monthlyCof,
      investmentType,
      account.transactionDate,
      new Date()
    );

    // Calculate with pre-fetched data
    const resultPrefetched = await calculateInstallmentValueWithRedemptions(
      account.id,
      netCapital,
      monthlyCof,
      investmentType,
      account.transactionDate,
      new Date(),
      prefetched
    );

    // Results should be identical
    expect(resultPrefetched.currentValue).toBeCloseTo(
      resultIndividual.currentValue,
      2
    );
    expect(resultPrefetched.totalRedemptions).toBe(
      resultIndividual.totalRedemptions
    );
    expect(resultPrefetched.daysInvested).toBe(resultIndividual.daysInvested);
    expect(resultPrefetched.monthlyBreakdown.length).toBe(
      resultIndividual.monthlyBreakdown.length
    );
  });
});

describe("Batch query count reduction (integration)", () => {
  it("getBatchRedemptions returns same data as N individual calls", async () => {
    const sampleAccounts = await getFixRateAccountSample();
    if (sampleAccounts.length < 2) {
      console.warn("Need at least 2 accounts for this test, skipping");
      return;
    }

    const ids = sampleAccounts.map((a) => a.id);

    // Single batch call
    const batchMap = await getBatchRedemptions(ids);

    // N individual calls (simulating old behavior)
    const db = createDrizzleConnection();
    const { mutations } = await import("@/db/drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    for (const id of ids) {
      const individualResults = await db
        .select({
          amount: mutations.amount,
          transactionDate: mutations.transaction_date,
          status: mutations.status,
        })
        .from(mutations)
        .where(
          and(
            eq(mutations.account_id, id),
            eq(mutations.type, "redemption"),
            eq(mutations.status, "completed")
          )
        )
        .orderBy(mutations.transaction_date);

      const batchResults = batchMap.get(id)!;

      // Same number of redemptions
      expect(batchResults.length).toBe(individualResults.length);

      // Same amounts (in same order)
      for (let i = 0; i < batchResults.length; i++) {
        expect(batchResults[i].amount).toBeCloseTo(
          Number(individualResults[i].amount),
          2
        );
        expect(batchResults[i].status).toBe(individualResults[i].status);
      }
    }
  });
});
