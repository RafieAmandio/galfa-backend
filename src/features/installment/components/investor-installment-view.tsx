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
    <div className="w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Your Installment Investments
        </h1>
        <p className="text-sm text-muted-foreground">
          View your installment investment schedule and track your net investor
          fund.
        </p>
      </div>

      <InvestorInstallmentTable investorEmail={user.email} />
    </div>
  );
}
