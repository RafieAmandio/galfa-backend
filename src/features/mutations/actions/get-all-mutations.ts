"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";

export type Mutation = typeof mutations.$inferSelect;

export async function getAllMutations() {
  const db = createDrizzleConnection();

  const mutationData = await db.select().from(mutations);

  return mutationData;
}
