"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { sql, desc } from "drizzle-orm";

export type Mutation = typeof mutations.$inferSelect;

export async function getAllMutations(
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {}
) {
  const db = createDrizzleConnection();

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mutations);

  const totalCount = Number(countResult.count);

  const mutationData = await db
    .select()
    .from(mutations)
    .orderBy(desc(mutations.transaction_date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: mutationData, totalCount, page, pageSize };
}
