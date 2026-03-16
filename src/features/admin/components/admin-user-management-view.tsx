"use client";

import { UsersTable } from "@/features/admin/components/users-table";
import { CreateUserModal } from "@/features/admin/components/create-user-modal";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";

interface AdminUserManagementViewProps {
  user: AuthUser;
}

export function AdminUserManagementView({
  user,
}: AdminUserManagementViewProps) {
  const handleUserCreated = () => {
    // Trigger table refresh
    if ((window as any).__refreshUsersTable) {
      (window as any).__refreshUsersTable();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-full">
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
