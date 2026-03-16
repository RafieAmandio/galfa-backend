"use client";

import React from "react";
import { CreateCapitalMarketAccountForm } from "../components/create-capital-market-account-form";
import { AdminCapitalMarketAccountsTable } from "../components/admin-capital-market-accounts-table";

export function AdminCapitalMarketAccountsView() {
  const handleAccountCreated = () => {
    // The table will handle its own refresh
    // We can add a callback mechanism if needed
  };

  return (
    <div className="w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Capital Market Accounts
          </h1>
          <p className="text-gray-600 mt-1">
            Manage capital market accounts for users
          </p>
        </div>
        <CreateCapitalMarketAccountForm
          onAccountCreated={handleAccountCreated}
        />
      </div>

      {/* Table Component */}
      <AdminCapitalMarketAccountsTable />
    </div>
  );
}
