"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface NavigationProps {
  user: User | null;
  isAdmin: boolean;
  authError?: string;
}

export function Navigation({ user, isAdmin, authError }: NavigationProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh(); // Refresh to update server-side auth state
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Galfa
              </Link>

              {/* Navigation Links - Left side */}
              {user && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {isAdmin ? (
                    // Admin navigation links
                    <>
                      <Link
                        href="/admin/dashboard"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/flat-rate"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Flat Rate
                      </Link>
                      <Link
                        href="/floating-rate"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Floating Rate
                      </Link>
                      <Link
                        href="/installments"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Installments
                      </Link>
                      <Link
                        href="/admin/user-management"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        User Management
                      </Link>
                      <Link
                        href="/admin/performance"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Performance
                      </Link>
                    </>
                  ) : (
                    // Regular user navigation
                    <>
                      <Link
                        href="/investor/summary"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/investor/flat-rate"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Flat Rate
                      </Link>
                      <Link
                        href="/investor/floating-rate"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Floating Rate
                      </Link>
                      <Link
                        href="/investor/installments"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Installments
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            {authError && (
              <div className="text-sm text-red-600 mr-4">Auth Error</div>
            )}

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  {loading ? "Signing Out..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Not authenticated</div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
