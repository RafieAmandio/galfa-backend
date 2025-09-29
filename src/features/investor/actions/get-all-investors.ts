"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { profiles, authUsers } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Get list of all investors for admin to select from
 */
export async function getAllInvestors(): Promise<InvestorOption[]> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      id: profiles.id,
      email: authUsers.email,
      fullName: profiles.full_name,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .orderBy(authUsers.email);

  return results
    .filter((result) => result.email !== null)
    .map((result) => ({
      id: result.id,
      email: result.email!,
      fullName: result.fullName,
    }));
}
