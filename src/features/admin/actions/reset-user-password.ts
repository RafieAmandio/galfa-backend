"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, message: "Unauthorized" };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" };
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `Failed (${res.status})` };
    }

    return { success: true, message: "Password updated" };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to reset password" };
  }
}
