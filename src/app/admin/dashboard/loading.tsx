import { DashboardSkeleton } from "@/features/admin/components/dashboard-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>
      </div>
      <DashboardSkeleton />
    </div>
  );
}
