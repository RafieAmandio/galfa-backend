import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createDrizzleConnection, getDbConnectionDebug } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  profiles,
  authUsers,
  vcPerformance,
} from "@/db/drizzle/schema";

export async function GET() {
  const debug = getDbConnectionDebug();
  const db = createDrizzleConnection();

  const [{ count: accountsCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(accounts);
  const [{ count: fixCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(fixRateAccounts);
  const [{ count: floatCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(floatingRateAccounts);
  const [{ count: instCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(installmentAccounts);
  const [{ count: profilesCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(profiles);
  const [{ count: authUsersCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(authUsers);
  const [{ count: vcPerfCountRaw }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(vcPerformance);

  const data = {
    debug,
    counts: {
      accounts: Number(accountsCountRaw ?? 0),
      fixRateAccounts: Number(fixCountRaw ?? 0),
      floatingRateAccounts: Number(floatCountRaw ?? 0),
      installmentAccounts: Number(instCountRaw ?? 0),
      profiles: Number(profilesCountRaw ?? 0),
      authUsers: Number(authUsersCountRaw ?? 0),
      vcPerformance: Number(vcPerfCountRaw ?? 0),
    },
    time: new Date().toISOString(),
  };

  console.info("Debug DB report:", data);
  return NextResponse.json(data);
}
