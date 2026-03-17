"use client";

import { MutationsAdminTable } from "../components/mutations-admin-table";

export function MutationsAdminView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mutations</h1>
          <p className="text-sm text-muted-foreground">
            Track all transaction mutations
          </p>
        </div>
      </div>

      <MutationsAdminTable />
    </div>
  );
}
