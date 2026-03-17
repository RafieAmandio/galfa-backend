"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  capitalMarketAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { desc, eq, sql, ilike, or } from "drizzle-orm";
import { cache } from "react";

export const adminGetAllCapitalMarketAccounts = cache(async function (
  { page = 1, pageSize = 10, search }: { page?: number; pageSize?: number; search?: string } = {}
) {
  const db = createDrizzleConnection();

  const searchFilter = search
    ? or(
        ilike(profiles.full_name, `%${search}%`),
        ilike(authUsers.email, `%${search}%`)
      )
    : undefined;

  const baseQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(capitalMarketAccounts)
    .leftJoin(profiles, eq(capitalMarketAccounts.user_id, profiles.id))
    .leftJoin(authUsers, eq(profiles.id, authUsers.id));

  const [countResult] = search
    ? await baseQuery.where(searchFilter)
    : await baseQuery;

  const totalCount = Number(countResult.count);

  const dataQuery = db
    .select({
      id: capitalMarketAccounts.id,
      user_id: capitalMarketAccounts.user_id,
      created_at: capitalMarketAccounts.created_at,
      updated_at: capitalMarketAccounts.updated_at,
      user_name: profiles.full_name,
      user_email: authUsers.email,
    })
    .from(capitalMarketAccounts)
    .leftJoin(profiles, eq(capitalMarketAccounts.user_id, profiles.id))
    .leftJoin(authUsers, eq(profiles.id, authUsers.id))
    .orderBy(desc(capitalMarketAccounts.created_at))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const capitalMarketAccountsResponse = search
    ? await dataQuery.where(searchFilter)
    : await dataQuery;

  return {
    data: capitalMarketAccountsResponse,
    totalCount,
    page,
    pageSize,
  };
});
