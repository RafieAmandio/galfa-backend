"use client";

import { MutationsAdminTable } from "@/features/mutations/components/mutations-admin-table";

export function RedemptionsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Redemptions</h1>
        <p className="text-sm text-muted-foreground">
          All redemption transactions across investment accounts
        </p>
      </div>
      <MutationsAdminTable typeFilter="redemption" />
    </div>
  );
}
