"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { sql, desc, ilike, or } from "drizzle-orm";

export type Mutation = typeof mutations.$inferSelect;

export async function getAllMutations(
  { page = 1, pageSize = 10, search }: { page?: number; pageSize?: number; search?: string } = {}
) {
  const db = createDrizzleConnection();

  const searchFilter = search
    ? or(
        ilike(mutations.description, `%${search}%`),
        ilike(mutations.type, `%${search}%`)
      )
    : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mutations)
    .where(searchFilter);

  const totalCount = Number(countResult.count);

  const mutationData = await db
    .select()
    .from(mutations)
    .where(searchFilter)
    .orderBy(desc(mutations.transaction_date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: mutationData, totalCount, page, pageSize };
}
