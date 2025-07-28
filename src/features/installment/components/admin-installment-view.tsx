"use client";

import { CreateInstallmentAccountModal } from "@/features/installment/components/create-installment-account-modal";
import { AdminInstallmentTable } from "@/features/installment/views/admin-installment-table";
import { InvestorOption } from "@/features/investor/actions/get-all-investors";

interface AdminInstallmentViewProps {
  investorEmails: InvestorOption[];
}

export function AdminInstallmentView({
  investorEmails,
}: AdminInstallmentViewProps) {
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

      <div className="flex justify-end mb-4">
        <CreateInstallmentAccountModal investorEmails={investorEmails} />
      </div>

      <AdminInstallmentTable />
    </div>
  );
}
