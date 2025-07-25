"use server";

import { createServerClient } from "@/db/supabase/server";
import { User } from "@supabase/supabase-js";

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<{
  user: User | null;
  error: string | null;
}> {
  try {
    // Get current user from Supabase
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        error: "Not authenticated",
      };
    }

    return {
      user,
      error: null,
    };
  } catch (error) {
    console.error("Admin check error:", error);
    return {
      user: null,
      error: "Failed to check admin status",
    };
  }
}
