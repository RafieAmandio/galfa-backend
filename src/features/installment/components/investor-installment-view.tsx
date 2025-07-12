"use client";

import { InvestorInstallmentTable } from "@/features/installment/views/investor-installment-table";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";

interface InvestorInstallmentViewProps {
  user: AuthUser;
}

export function InvestorInstallmentView({
  user,
}: InvestorInstallmentViewProps) {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Installment Investments
        </h1>
        <p className="text-gray-600">
          View your installment investment schedule and track your net investor
          fund.
        </p>
      </div>

      <InvestorInstallmentTable investorEmail={user.email} />
    </div>
  );
}
