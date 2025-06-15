"use server";

import { checkAdminAccess } from "./admin-check";

/**
 * Server action to check admin status - can be called from client components
 */
export async function getAdminStatus() {
  try {
    const result = await checkAdminAccess();
    return {
      isAdmin: result.isAdmin,
      hasUser: !!result.user,
      error: result.error,
    };
  } catch (error) {
    console.error("Client admin check error:", error);
    return {
      isAdmin: false,
      hasUser: false,
      error: "Failed to check admin status",
    };
  }
}
