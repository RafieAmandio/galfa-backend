"use client";

import { useEffect, useState } from "react";
import { getAllUsers, type UserWithDetails } from "../actions/get-users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface UsersTableProps {
  onRefresh?: () => void;
}

export function UsersTable({ onRefresh }: UsersTableProps) {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllUsers();

      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setError(result.message || "Failed to fetch users");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Allow parent component to trigger refresh
  useEffect(() => {
    if (onRefresh) {
      // This is a bit of a hack to allow parent to trigger refresh
      (window as any).__refreshUsersTable = fetchUsers;
    }
  }, [onRefresh]);

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return format(new Date(date), "d MMMM yyyy 'at' HH:mm");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "investor":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700 text-center">{error}</p>
        <button
          onClick={fetchUsers}
          className="mt-2 block mx-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          <button
            onClick={fetchUsers}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Total: {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Sign In</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.fullName || (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <span className="text-gray-400 italic">No roles</span>
                    ) : (
                      user.roles.map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                            role
                          )}`}
                        >
                          {role}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.isConfirmed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {user.isConfirmed ? "Confirmed" : "Pending"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(user.lastSignInAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
