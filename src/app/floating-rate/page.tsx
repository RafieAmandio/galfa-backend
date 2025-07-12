import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import FloatingRateInvestmentsMonthlyTable from "@/features/floating-rate/views/floating-rate-investments-monthly-table";
import { CreateFloatingRateModal } from "@/features/floating-rate/components/create-floating-rate-modal";

export default async function FloatingRatePage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Floating Rate Investments
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor floating rate investment accounts
            </p>
          </div>
          <CreateFloatingRateModal />
        </div>
      </div>

      <FloatingRateInvestmentsMonthlyTable />
    </div>
  );
}
