"use client";

import { FlatRateInvestmentsTable } from "@/features/flat-rate/views/flat-rate-investments-table";
import { RedeemFlatRateModal } from "@/features/flat-rate/components/redeem-flat-rate-modal";
import { CreateFlatRateModal } from "@/features/flat-rate/components/create-flat-rate-modal";

interface AdminFlatRateViewProps {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

export function AdminFlatRateView({ user }: AdminFlatRateViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Fixed Rate Investments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage fixed rate investment accounts and calculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateFlatRateModal
            onAccountCreated={() => {
              window.location.reload();
            }}
          />
          <RedeemFlatRateModal
            onRedemptionComplete={() => {
              window.location.reload();
            }}
          />
        </div>
      </div>

      <FlatRateInvestmentsTable />
    </div>
  );
}
