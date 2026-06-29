"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { createServerAdminClient } from "@/db/supabase/server";
import {
  accounts,
  profiles,
  roleAssignments,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/db/supabase/server";

interface DeleteUserResult {
  success: boolean;
  message: string;
}

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return { success: false, message: "Unauthorized: Admin access required" };
  }

  // Prevent self-deletion
  const supabase = await createServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser?.id === userId) {
    return { success: false, message: "You cannot delete your own account" };
  }

  const db = createDrizzleConnection();

  // Check if user has investment accounts
  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.user_id, userId))
    .limit(1);

  if (userAccounts.length > 0) {
    return {
      success: false,
      message:
        "Cannot delete user with existing investment accounts. Delete their accounts first.",
    };
  }

  try {
    // Delete role assignments and profile via Drizzle
    await db
      .delete(roleAssignments)
      .where(eq(roleAssignments.user_id, userId));
    await db.delete(profiles).where(eq(profiles.id, userId));

    // Delete auth user via Supabase Admin API
    const supabaseAdmin = await createServerAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return {
        success: false,
        message: `Failed to delete auth user: ${error.message}`,
      };
    }

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Delete user error:", error);
    return {
      success: false,
      message: "An error occurred while deleting the user",
    };
  }
}
