"use client";

import { useEffect, useState } from "react";
import InvestorFloatingRateInvestmentsTable from "@/features/floating-rate/views/investor-floating-rate-investments-table";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { NoUserError } from "@/components/NoUserError";

export default function InvestorFloatingRatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  if (authLoading) {
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Floating Rate Investments
        </h1>
        <p className="text-gray-600">
          View your floating rate investment performance with real-time market
          adjustments.
        </p>
      </div>

      <InvestorFloatingRateInvestmentsTable investorEmail={user.email || ""} />
    </div>
  );
}
