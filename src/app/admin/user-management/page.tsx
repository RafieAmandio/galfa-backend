"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminStatus } from "@/lib/auth/client-admin-check";
import { UsersTable } from "@/features/admin/components/users-table";
import { CreateUserModal } from "@/features/admin/components/create-user-modal";

export default function AdminUserManagementPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await getAdminStatus();

        if (!result.hasUser) {
          // Not authenticated - redirect to login
          router.push("/");
          return;
        }

        if (!result.isAdmin) {
          // Authenticated but not admin - redirect to investor summary
          router.push("/investor/summary");
          return;
        }

        setIsAdmin(true);
        setError(result.error || null);
      } catch (err) {
        console.error("Admin check error:", err);
        setError("Failed to verify admin access");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This shouldn't happen due to redirects, but just in case
  }

  const handleUserCreated = () => {
    // Trigger table refresh
    if ((window as any).__refreshUsersTable) {
      (window as any).__refreshUsersTable();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                User Management
              </h1>
              <p className="text-gray-600">
                Create and manage user accounts for the Galfa investment
                platform.
              </p>
            </div>
            <CreateUserModal onUserCreated={handleUserCreated} />
          </div>
        </div>

        <UsersTable onRefresh={() => {}} />
      </div>
    </div>
  );
}
