"use server";

import { createServerClient } from "@/db/supabase/server";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "./admin-check";

export interface AuthUser {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * Get the current authenticated user from server-side
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    return {
      ...user,
      email: user.email,
    };
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Get the current authenticated user and redirect if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

/**
 * Check if current user is admin and redirect if not
 */
export async function requireAdmin(): Promise<AuthUser> {
  const adminCheck = await checkAdminAccess();

  if (!adminCheck.isAdmin || !adminCheck.user?.email) {
    redirect("/");
  }

  return {
    ...adminCheck.user,
    email: adminCheck.user.email,
  };
}

/**
 * Check if current user is authenticated and is admin
 * If not authenticated, redirect to home
 * If authenticated but not admin, redirect to investor summary
 */
export async function requireAdminOrRedirectToSummary(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const adminCheck = await checkAdminAccess();

  if (!adminCheck.isAdmin) {
    redirect("/investor/summary");
  }

  return user;
}
