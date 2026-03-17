"use client";

import { CreateInstallmentAccountModal } from "@/features/installment/components/create-installment-account-modal";
import { RedeemInstallmentModal } from "@/features/installment/components/redeem-installment-modal";
import { AdminInstallmentTable } from "@/features/installment/views/admin-installment-table";
import { InvestorOption } from "@/features/investor/actions/get-all-investors";
import { getInstallmentAccountsForRedemption } from "@/features/installment/actions/get-installment-accounts-for-redemption";
import { useState, useEffect } from "react";

interface AdminInstallmentViewProps {
  investorEmails: InvestorOption[];
}

export function AdminInstallmentView({
  investorEmails,
}: AdminInstallmentViewProps) {
  const [redemptionAccounts, setRedemptionAccounts] = useState<any[] | null>(
    null
  );
  const [loadingRedemptionAccounts, setLoadingRedemptionAccounts] =
    useState(false);

  useEffect(() => {
    const loadRedemptionAccounts = async () => {
      setLoadingRedemptionAccounts(true);
      try {
        const accounts = await getInstallmentAccountsForRedemption(new Date());
        setRedemptionAccounts(accounts);
      } catch (error) {
        console.error("Error loading redemption accounts:", error);
      } finally {
        setLoadingRedemptionAccounts(false);
      }
    };

    loadRedemptionAccounts();
  }, []);

  const handleRedemptionComplete = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Installment Investments
          </h1>
          <p className="text-sm text-muted-foreground">
            Track gained funds, present value, and net present value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RedeemInstallmentModal
            onRedemptionComplete={handleRedemptionComplete}
            initialRedemptionAccounts={redemptionAccounts}
          />
          <CreateInstallmentAccountModal investorEmails={investorEmails} />
        </div>
      </div>

      <AdminInstallmentTable />
    </div>
  );
}
