"use server";

import { createServerAdminClient } from "@/db/supabase/server";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { profiles, roleAssignments } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export interface CreateUserResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function createUserByAdmin(
  email: string,
  password: string,
  fullName: string,
  role: "admin" | "investor" = "investor"
): Promise<CreateUserResult> {
  try {
    // Check if current user is admin
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: "Unauthorized: Only admins can create users",
      };
    }

    // Create Supabase admin client
    const supabase = await createServerAdminClient();

    // Create user with admin client (bypasses email confirmation)
    const { data: userData, error: signUpError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

    if (signUpError || !userData.user) {
      return {
        success: false,
        message: signUpError?.message || "Failed to create user",
      };
    }

    // Create or update profile in database
    const db = createDrizzleConnection();

    // Use upsert to handle cases where profile might already exist
    await db
      .insert(profiles)
      .values({
        id: userData.user.id,
        full_name: fullName,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          full_name: fullName,
          updated_at: new Date(),
        },
      });

    // Check if role assignment already exists
    const existingRole = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.user_id, userData.user.id))
      .limit(1);

    // Only assign role if it doesn't already exist
    if (existingRole.length === 0) {
      await db.insert(roleAssignments).values({
        user_id: userData.user.id,
        role_name: role,
      });
    }

    return {
      success: true,
      message: `User ${email} created successfully with ${role} role`,
      userId: userData.user.id,
    };
  } catch (error) {
    console.error("Create user error:", error);
    return {
      success: false,
      message: "An error occurred while creating the user",
    };
  }
}
