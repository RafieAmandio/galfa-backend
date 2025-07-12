"use client";

import { AdminInstallmentTable } from "@/features/installment/views/admin-installment-table";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";

interface AdminInstallmentViewProps {
  user: AuthUser;
}

export function AdminInstallmentView({ user }: AdminInstallmentViewProps) {
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
