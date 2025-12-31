import { NextResponse } from "next/server";
import { createDrizzleConnection, getDbConnectionDebug, getRuntimeDebug } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = createDrizzleConnection();
  const debug = getDbConnectionDebug();
  const runtime = getRuntimeDebug();

  const rows = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      capital: accounts.capital,
      annualRate: fixRateAccounts.annual_rate,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      status: accounts.status,
      isRollover: accounts.is_rollover,
      rolloverSequence: accounts.rollover_sequence,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id));

  const data = {
    debug,
    runtime,
    count: rows.length,
    sample: rows.slice(0, 5).map((r) => ({
      id: r.id,
      accountNumber: r.accountNumber,
      capital: Number(r.capital),
      annualRate: Number(r.annualRate),
      transactionDate: r.transactionDate,
      endDate: r.endDate,
      status: r.status,
      isRollover: Boolean(r.isRollover),
      rolloverSequence: r.rolloverSequence,
    })),
    now: new Date().toISOString(),
  };

  console.info("Debug flat-rate report:", {
    count: data.count,
    runtime: data.runtime,
  });
  return NextResponse.json(data);
}
