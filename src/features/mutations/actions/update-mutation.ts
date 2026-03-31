"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations, accounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";

interface UpdateMutationRequest {
  mutationId: number;
  amount?: number;
  transactionDate?: Date;
  description?: string;
  status?: string;
}

export async function updateMutation(request: UpdateMutationRequest) {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return { success: false, message: "Unauthorized: Admin access required" };
  }

  const db = createDrizzleConnection();

  try {
    // Get the mutation and its account
    const [mutation] = await db
      .select()
      .from(mutations)
      .where(eq(mutations.id, request.mutationId))
      .limit(1);

    if (!mutation) {
      return { success: false, message: "Mutation not found" };
    }

    // If updating transaction date, validate it's within account date range
    if (request.transactionDate) {
      const [account] = await db
        .select({
          transactionDate: accounts.transaction_date,
          endDate: accounts.end_date,
        })
        .from(accounts)
        .where(eq(accounts.id, mutation.account_id!))
        .limit(1);

      if (account) {
        if (request.transactionDate < account.transactionDate) {
          return {
            success: false,
            message: `Transaction date cannot be before account start date (${account.transactionDate.toLocaleDateString()})`,
          };
        }
        if (account.endDate && request.transactionDate > account.endDate) {
          return {
            success: false,
            message: `Transaction date cannot be after account end date (${account.endDate.toLocaleDateString()})`,
          };
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (request.amount !== undefined) updateData.amount = request.amount.toString();
    if (request.transactionDate) updateData.transaction_date = request.transactionDate;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.status) updateData.status = request.status;

    await db
      .update(mutations)
      .set(updateData)
      .where(eq(mutations.id, request.mutationId));

    return { success: true, message: "Mutation updated successfully" };
  } catch (error) {
    console.error("Update mutation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update mutation",
    };
  }
}

export async function deleteMutation(mutationId: number) {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return { success: false, message: "Unauthorized: Admin access required" };
  }

  const db = createDrizzleConnection();

  try {
    const [mutation] = await db
      .select()
      .from(mutations)
      .where(eq(mutations.id, mutationId))
      .limit(1);

    if (!mutation) {
      return { success: false, message: "Mutation not found" };
    }

    await db.delete(mutations).where(eq(mutations.id, mutationId));

    return { success: true, message: "Mutation deleted successfully" };
  } catch (error) {
    console.error("Delete mutation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete mutation",
    };
  }
}
