import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth-helpers";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
  vcPerformance,
  mutations,
} from "@/db/drizzle/schema";
import { eq, and, between, gte, lte } from "drizzle-orm";
import {
  startOfMonth,
  addMonths,
  isAfter,
  differenceInMonths,
} from "date-fns";

interface TimingEntry {
  label: string;
  duration: number;
  details?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter required" },
      { status: 400 }
    );
  }

  const timings: TimingEntry[] = [];
  const overallStart = performance.now();
  let growthRateQueries = 0;
  let redemptionQueries = 0;

  try {
    const db = createDrizzleConnection();

    // Step 1: Fetch basic investment data
    const step1Start = performance.now();
    const investments = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        adminFee: floatingRateAccounts.admin_fee,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, email));

    timings.push({
      label: "Fetch investment records",
      duration: performance.now() - step1Start,
      details: `Found ${investments.length} floating rate investments`,
    });

    if (investments.length === 0) {
      return NextResponse.json({
        totalDuration: performance.now() - overallStart,
        timings,
        investmentCount: 0,
        monthsProcessed: 0,
        growthRateQueries: 0,
        redemptionQueries: 0,
      });
    }

    // Step 2: Calculate date range
    const step2Start = performance.now();
    const earliestDate = investments.reduce((earliest, inv) => {
      return inv.transactionDate < earliest ? inv.transactionDate : earliest;
    }, investments[0].transactionDate);

    const currentMonth = startOfMonth(new Date());
    const totalMonths = differenceInMonths(currentMonth, earliestDate) + 1;

    timings.push({
      label: "Calculate date range",
      duration: performance.now() - step2Start,
      details: `Date range: ${earliestDate.toISOString().split("T")[0]} to ${currentMonth.toISOString().split("T")[0]} (${totalMonths} months)`,
    });

    // Step 3: Simulate the N+1 query pattern (like investor view does)
    const step3Start = performance.now();
    const growthRates: Array<{
      month: Date;
      growthPercentage: number;
      queryTime: number;
    }> = [];

    let monthToCheck = startOfMonth(earliestDate);
    while (!isAfter(monthToCheck, currentMonth)) {
      const queryStart = performance.now();

      // This simulates what getFloatingRateGrowthPercentage does
      const monthStart = startOfMonth(monthToCheck);
      const monthEnd = addMonths(monthStart, 1);

      const vcData = await db
        .select({
          growthPercentage: vcPerformance.growth_percentage,
          performancePercentage: vcPerformance.performance_percentage,
        })
        .from(vcPerformance)
        .where(
          and(
            gte(vcPerformance.effective_date, monthStart),
            lte(vcPerformance.effective_date, monthEnd)
          )
        )
        .limit(1);

      growthRateQueries++;

      growthRates.push({
        month: monthToCheck,
        growthPercentage: vcData[0]?.growthPercentage
          ? parseFloat(vcData[0].growthPercentage)
          : 0,
        queryTime: performance.now() - queryStart,
      });

      monthToCheck = addMonths(monthToCheck, 1);
    }

    const avgQueryTime =
      growthRates.reduce((sum, r) => sum + r.queryTime, 0) / growthRates.length;

    timings.push({
      label: "Fetch growth rates (N+1 pattern)",
      duration: performance.now() - step3Start,
      details: `${growthRateQueries} queries, avg ${avgQueryTime.toFixed(1)}ms each`,
    });

    // Step 4: Fetch redemptions for each investment
    const step4Start = performance.now();
    for (const investment of investments) {
      const queryStart = performance.now();

      await db
        .select({
          amount: mutations.amount,
          transactionDate: mutations.transaction_date,
        })
        .from(mutations)
        .where(
          and(
            eq(mutations.account_id, investment.id),
            eq(mutations.mutation_type, "redemption")
          )
        );

      redemptionQueries++;

      timings.push({
        label: `Redemptions for ${investment.accountNumber}`,
        duration: performance.now() - queryStart,
      });
    }

    timings.push({
      label: "Total redemption queries",
      duration: performance.now() - step4Start,
      details: `${redemptionQueries} queries for ${investments.length} investments`,
    });

    // Step 5: Simulate calculation overhead
    const step5Start = performance.now();
    // Simulate the compound interest calculations
    for (const investment of investments) {
      let value = parseFloat(investment.grossCapital);
      for (const rate of growthRates) {
        value = value * (1 + rate.growthPercentage / 100);
      }
    }

    timings.push({
      label: "Calculate compound values",
      duration: performance.now() - step5Start,
      details: `${investments.length} investments x ${growthRates.length} months`,
    });

    // Compare with optimized batch approach
    const step6Start = performance.now();
    const firstMonth = startOfMonth(earliestDate);
    const lastMonth = currentMonth;

    // Single batch query for all VC data
    const allVcData = await db
      .select({
        effectiveDate: vcPerformance.effective_date,
        growthPercentage: vcPerformance.growth_percentage,
        performancePercentage: vcPerformance.performance_percentage,
      })
      .from(vcPerformance)
      .where(
        and(
          gte(vcPerformance.effective_date, firstMonth),
          lte(vcPerformance.effective_date, lastMonth)
        )
      );

    timings.push({
      label: "Batch VC data query (optimized)",
      duration: performance.now() - step6Start,
      details: `Single query returned ${allVcData.length} records`,
    });

    // Batch redemptions query
    const step7Start = performance.now();
    const investmentIds = investments.map((i) => i.id);

    // Note: In a real optimization, we'd use IN clause
    // This is simplified for the diagnostic
    const allRedemptions = await db
      .select({
        accountId: mutations.account_id,
        amount: mutations.amount,
        transactionDate: mutations.transaction_date,
      })
      .from(mutations)
      .where(eq(mutations.mutation_type, "redemption"));

    const relevantRedemptions = allRedemptions.filter((r) =>
      investmentIds.includes(r.accountId)
    );

    timings.push({
      label: "Batch redemptions query (optimized)",
      duration: performance.now() - step7Start,
      details: `Found ${relevantRedemptions.length} redemptions for all investments`,
    });

    const totalDuration = performance.now() - overallStart;

    return NextResponse.json({
      totalDuration,
      timings,
      investmentCount: investments.length,
      monthsProcessed: totalMonths,
      growthRateQueries,
      redemptionQueries,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        totalDuration: performance.now() - overallStart,
        timings,
        investmentCount: 0,
        monthsProcessed: 0,
        growthRateQueries,
        redemptionQueries,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
