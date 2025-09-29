"server-only";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { authUsers, profiles, roleAssignments } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/db/supabase/server";

export interface AdminCheckResult {
  isAdmin: boolean;
  user: any | null;
  error?: string;
}

/**
 * Check if the current authenticated user has admin privileges
 * Checks both super admin flag and role assignments
 */
export async function checkAdminAccess(): Promise<AdminCheckResult> {
  try {
    // Get current user from Supabase
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        isAdmin: false,
        user: null,
        error: "Not authenticated",
      };
    }

    const db = createDrizzleConnection();

    // Check if user is super admin in auth.users table
    const authUserResult = await db
      .select({
        isSuperAdmin: authUsers.is_super_admin,
        email: authUsers.email,
      })
      .from(authUsers)
      .where(eq(authUsers.id, user.id))
      .limit(1);

    if (authUserResult.length > 0 && authUserResult[0].isSuperAdmin) {
      return {
        isAdmin: true,
        user,
      };
    }

    // Check role assignments for admin role (using new simplified schema)
    const roleResult = await db
      .select({
        roleName: roleAssignments.role_name,
      })
      .from(roleAssignments)
      .where(eq(roleAssignments.user_id, user.id));

    // Check if user has admin role (filter out null/undefined values)
    const hasAdminRole = roleResult.some(
      (role) => role.roleName && role.roleName.toLowerCase() === "admin"
    );

    return {
      isAdmin: hasAdminRole,
      user,
    };
  } catch (error) {
    console.error("Admin check error:", error);
    return {
      isAdmin: false,
      user: null,
      error: "Failed to check admin status",
    };
  }
}

/**
 * Get user's roles for display purposes
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const db = createDrizzleConnection();

    const roleResult = await db
      .select({
        roleName: roleAssignments.role_name,
      })
      .from(roleAssignments)
      .where(eq(roleAssignments.user_id, userId));

    return roleResult.map((role) => role.roleName).filter(Boolean);
  } catch (error) {
    console.error("Get user roles error:", error);
    return [];
  }
}
