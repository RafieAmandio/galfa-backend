"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  capitalMarketAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";

export const adminGetAllCapitalMarketAccounts = cache(async function () {
  const db = createDrizzleConnection();

  const capitalMarketAccountsResponse = await db
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
    .orderBy(desc(capitalMarketAccounts.created_at));

  return capitalMarketAccountsResponse;
});
