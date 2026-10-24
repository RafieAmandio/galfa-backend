"use server";

import { createServerClient } from "@/db/supabase/server";

export async function changePassword(
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: "Password must be at least 6 characters" };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Password updated successfully" };
}
