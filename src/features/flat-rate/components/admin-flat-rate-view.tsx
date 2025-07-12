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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg
                  className="w-6 h-6 text-red-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 8a6 6 0 01-7.743 5.743L10 14l-4 4-4-4 4-4 .257-.257A6 6 0 1118 8zm-6-2a1 1 0 11-2 0 1 1 0 012 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Admin Panel - Flat Rate Investments
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
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Admin Access
              </span>
            </div>
          </div>
        </div>

        {/* Flat Rate Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <FlatRateInvestmentsTable />
        </div>
      </div>
    </div>
  );
}
