import { NextRequest, NextResponse } from "next/server";
import { getStatementOfAccountData } from "@/features/reports/actions/get-statement-of-account-data";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "aqila.dika@galfaco.com";
  const debug = searchParams.get("debug");

  if (debug === "growth") {
    const growthMap = await getBatchFloatingRateGrowthPercentages(
      new Date("2025-01-01"),
      new Date("2026-03-01")
    );
    const entries: Record<string, unknown> = {};
    for (const [key, value] of growthMap) {
      entries[key] = value;
    }
    return NextResponse.json({ growthRates: entries });
  }

  const result = await getStatementOfAccountData(email);
  return NextResponse.json(result, { status: 200 });
}
