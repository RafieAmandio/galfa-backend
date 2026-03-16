"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, FileText } from "lucide-react";
import { InvestorReportsTable } from "./investor-reports-table";
import { SendBulkEmailModal } from "./send-bulk-email-modal";
import type { InvestorOption } from "@/features/investor/actions/get-all-investors";

interface AdminReportsViewProps {
  investors: InvestorOption[];
}

export function AdminReportsView({ investors }: AdminReportsViewProps) {
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);

  return (
    <div className="w-full max-w-full">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Investor Reports
            </h1>
            <p className="mt-2 text-gray-600">
              Generate and send investment portfolio reports to investors
            </p>
          </div>
          <Button onClick={() => setIsBulkEmailModalOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Send to All Investors
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            All Investors
          </h2>
        </div>

        <InvestorReportsTable investors={investors} />
      </div>

      <SendBulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        totalInvestors={investors.length}
      />
    </div>
  );
}
