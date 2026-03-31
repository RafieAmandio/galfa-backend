"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations, accounts } from "@/db/drizzle/schema";
import { sql, desc, ilike, or, eq } from "drizzle-orm";

export type Mutation = typeof mutations.$inferSelect & {
  accountNumber: string | null;
};

export async function getAllMutations(
  { page = 1, pageSize = 10, search }: { page?: number; pageSize?: number; search?: string } = {}
) {
  const db = createDrizzleConnection();

  const searchFilter = search
    ? or(
        ilike(mutations.description, `%${search}%`),
        ilike(mutations.type, `%${search}%`),
        ilike(accounts.account_number, `%${search}%`)
      )
    : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mutations)
    .leftJoin(accounts, eq(mutations.account_id, accounts.id))
    .where(searchFilter);

  const totalCount = Number(countResult.count);

  const mutationData = await db
    .select({
      id: mutations.id,
      account_id: mutations.account_id,
      type: mutations.type,
      amount: mutations.amount,
      description: mutations.description,
      status: mutations.status,
      transaction_date: mutations.transaction_date,
      created_at: mutations.created_at,
      updated_at: mutations.updated_at,
      accountNumber: accounts.account_number,
    })
    .from(mutations)
    .leftJoin(accounts, eq(mutations.account_id, accounts.id))
    .where(searchFilter)
    .orderBy(desc(mutations.transaction_date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: mutationData, totalCount, page, pageSize };
}
