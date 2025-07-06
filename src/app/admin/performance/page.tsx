import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { PerformanceTable } from "@/features/investments/views/performance-table";

export default async function PerformancePage() {
  // Check if user is admin before rendering the page
  const adminCheck = await checkAdminAccess();

  if (!adminCheck.isAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PerformanceTable />
    </div>
  );
}
