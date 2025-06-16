import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function AdminDashboardPage() {
  // Check if user is admin
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monthly analytics and insights for flat-rate investments
        </p>
      </div>

      <AdminDashboard />
    </div>
  );
}
