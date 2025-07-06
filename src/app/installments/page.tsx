"use client";

import { useEffect, useState } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminInstallmentTable } from "@/features/installment/views/admin-installment-table";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { NoUserError } from "@/components/NoUserError";

export default function InstallmentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading } = useAdminCheck(user);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <NoUserError />;
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You need admin privileges to view installment investments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Installment Investments - Admin View
        </h1>
        <p className="text-gray-600">
          Track gained funds, present value, and net present value for all
          installment investments.
        </p>
      </div>

      <AdminInstallmentTable />
    </div>
  );
}
