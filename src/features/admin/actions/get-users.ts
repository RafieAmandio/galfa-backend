"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { authUsers, profiles, roleAssignments } from "@/db/drizzle/schema";
import { eq, sql, desc, count } from "drizzle-orm";

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
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  message?: string;
}

export interface GetUsersPaginatedParams {
  page?: number;
  pageSize?: number;
}

export async function getAllUsers(
  params: GetUsersPaginatedParams = {}
): Promise<GetUsersResult> {
  const { page = 1, pageSize = 20 } = params;

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

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(authUsers);
    const totalCount = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get paginated users with their profiles
    const offset = (page - 1) * pageSize;
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
      .orderBy(desc(authUsers.created_at))
      .limit(pageSize)
      .offset(offset);

    // Get role assignments only for the fetched users
    const userIds = usersWithProfiles.map((u) => u.id);
    const roleData =
      userIds.length > 0
        ? await db
            .select({
              userId: roleAssignments.user_id,
              roleName: roleAssignments.role_name,
            })
            .from(roleAssignments)
            .where(sql`${roleAssignments.user_id} IN ${userIds}`)
        : [];

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
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return {
      success: false,
      message: "An error occurred while fetching users",
    };
  }
}
