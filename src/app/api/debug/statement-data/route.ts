import { NextRequest, NextResponse } from "next/server";
import { getStatementOfAccountData } from "@/features/reports/actions/get-statement-of-account-data";
import { getStatementOfAccountDataDebug } from "@/features/reports/actions/get-statement-of-account-data";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "aqila.dika@galfaco.com";
  const debug = searchParams.get("debug");

  if (debug === "growth") {
    const { getFloatingRateAllocatedProfitPublic } = await import(
      "@/features/floating-rate/actions/get-floating-rate-allocated-profit/index"
    );
    const month = searchParams.get("month") || "2025-02";
    const monthDate = new Date(month + "-15");
    const allocResult = await getFloatingRateAllocatedProfitPublic(monthDate);

    const growthMap = await getBatchFloatingRateGrowthPercentages(
      new Date("2025-01-01"),
      new Date("2026-03-01")
    );
    const entries: Record<string, unknown> = {};
    for (const [key, value] of growthMap) {
      entries[key] = value;
    }
    return NextResponse.json({
      allocatedProfit: allocResult,
      growthRates: entries
    });
  }

  if (debug === "accounts") {
    const result = await getStatementOfAccountDataDebug(email);
    return NextResponse.json(result, { status: 200 });
  }

  const result = await getStatementOfAccountData(email);
  return NextResponse.json(result, { status: 200 });
}

