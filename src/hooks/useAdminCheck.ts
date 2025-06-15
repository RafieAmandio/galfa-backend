"use client";

import { useState, useEffect } from "react";
import { getAdminStatus } from "@/lib/auth/client-admin-check";
import type { User } from "@supabase/supabase-js";

export interface AdminStatus {
  isAdmin: boolean;
  loading: boolean;
  error?: string;
}

export function useAdminCheck(user: User | null): AdminStatus {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setAdminStatus({
          isAdmin: false,
          loading: false,
        });
        return;
      }

      try {
        // Call server action to check admin status
        const result = await getAdminStatus();

        setAdminStatus({
          isAdmin: result.isAdmin,
          loading: false,
          error: result.error,
        });
      } catch (error) {
        console.error("Admin check error:", error);
        setAdminStatus({
          isAdmin: false,
          loading: false,
          error: "Failed to check admin status",
        });
      }
    }

    checkAdminStatus();
  }, [user]);

  return adminStatus;
}
