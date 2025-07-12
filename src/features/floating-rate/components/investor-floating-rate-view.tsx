"use client";

import InvestorFloatingRateInvestmentsTable from "@/features/floating-rate/views/investor-floating-rate-investments-table";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";

interface InvestorFloatingRateViewProps {
  user: AuthUser;
}

export function InvestorFloatingRateView({
  user,
}: InvestorFloatingRateViewProps) {
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

      <InvestorFloatingRateInvestmentsTable investorEmail={user.email} />
    </div>
  );
}
