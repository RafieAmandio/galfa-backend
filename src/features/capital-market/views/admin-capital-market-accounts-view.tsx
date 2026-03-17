"use client";

import React from "react";
import { CreateCapitalMarketAccountForm } from "../components/create-capital-market-account-form";
import { AdminCapitalMarketAccountsTable } from "../components/admin-capital-market-accounts-table";

export function AdminCapitalMarketAccountsView() {
  const handleAccountCreated = () => {
    // The table will handle its own refresh
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Capital Market Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage capital market accounts for users
          </p>
        </div>
        <CreateCapitalMarketAccountForm
          onAccountCreated={handleAccountCreated}
        />
      </div>

      <AdminCapitalMarketAccountsTable />
    </div>
  );
}
