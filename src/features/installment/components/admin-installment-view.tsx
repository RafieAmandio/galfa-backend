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

  // Load redemption accounts for today
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
    // Refresh the table data
    window.location.reload();
  };

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

      <div className="flex justify-end gap-4 mb-4">
        <RedeemInstallmentModal
          onRedemptionComplete={handleRedemptionComplete}
          initialRedemptionAccounts={redemptionAccounts}
        />
        <CreateInstallmentAccountModal investorEmails={investorEmails} />
      </div>

      <AdminInstallmentTable />
    </div>
  );
}
