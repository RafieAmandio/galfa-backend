"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { authUsers, profiles, roleAssignments } from "@/db/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export interface UserWithDetails {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  createdAt: Date | null;
  lastSignInAt: Date | null;
  isConfirmed: boolean;
}

export interface GetUsersResult {
  success: boolean;
  users?: UserWithDetails[];
  message?: string;
}

export async function getAllUsers(): Promise<GetUsersResult> {
  try {
    // Check if current user is admin
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: "Unauthorized: Only admins can view users",
      };
    }

    const db = createDrizzleConnection();

    // Get all users with their profiles and roles
    const usersWithProfiles = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        fullName: profiles.full_name,
        createdAt: authUsers.created_at,
        lastSignInAt: authUsers.last_sign_in_at,
        confirmedAt: authUsers.confirmed_at,
        emailConfirmedAt: authUsers.email_confirmed_at,
      })
      .from(authUsers)
      .leftJoin(profiles, eq(authUsers.id, profiles.id))
      .orderBy(authUsers.created_at);

    // Get all role assignments
    const roleData = await db
      .select({
        userId: roleAssignments.user_id,
        roleName: roleAssignments.role_name,
      })
      .from(roleAssignments);

    // Create a map of user roles
    const userRoles: Record<string, string[]> = {};
    roleData.forEach((role) => {
      if (!userRoles[role.userId]) {
        userRoles[role.userId] = [];
      }
      if (role.roleName) {
        userRoles[role.userId].push(role.roleName);
      }
    });

    // Combine the data
    const users: UserWithDetails[] = usersWithProfiles.map((user) => ({
      id: user.id,
      email: user.email || "No email",
      fullName: user.fullName,
      roles: userRoles[user.id] || [],
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      isConfirmed: !!(user.confirmedAt || user.emailConfirmedAt),
    }));

    return {
      success: true,
      users,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return {
      success: false,
      message: "An error occurred while fetching users",
    };
  }
}
