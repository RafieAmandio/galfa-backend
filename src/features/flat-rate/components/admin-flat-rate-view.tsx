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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Admin Header */}
        <div className="rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                Flat Rate Investments
              </h1>
              <p className="text-gray-600 mt-1">
                Administrative access to flat rate investment calculations and
                data
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <CreateFlatRateModal
                onAccountCreated={() => {
                  // Refresh the table data to show new investment
                  window.location.reload();
                }}
              />
              <RedeemFlatRateModal
                onRedemptionComplete={() => {
                  // Optionally refresh the table data
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>

        {/* Flat Rate Table */}

        <FlatRateInvestmentsTable />
      </div>
    </div>
  );
}
