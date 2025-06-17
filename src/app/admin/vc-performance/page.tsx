import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { VCPerformanceTable } from "@/features/investments/views/vc-performance-table";

export default async function VCPerformancePage() {
  // Check if user is admin before rendering the page
  const adminCheck = await checkAdminAccess();

  if (!adminCheck.isAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <VCPerformanceTable />
    </div>
  );
}
