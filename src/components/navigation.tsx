"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  user: User | null;
  isAdmin: boolean;
  authError?: string;
}

export function Navigation({ user, isAdmin, authError }: NavigationProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  // Helper function to determine if a route is active
  const isActiveRoute = (path: string) => {
    return pathname === path;
  };

  // Helper function to get link classes based on active state
  const getLinkClasses = (path: string) => {
    const baseClasses =
      "text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200";
    const activeClasses =
      "bg-blue-100 text-blue-700 border-b-2 border-blue-500";
    const inactiveClasses =
      "text-gray-900 hover:text-gray-500 hover:bg-gray-50";

    return `${baseClasses} ${
      isActiveRoute(path) ? activeClasses : inactiveClasses
    }`;
  };

  // Helper function to check if any investment route is active
  const isAnyInvestmentRouteActive = () => {
    const investmentRoutes = isAdmin
      ? ["/admin/flat-rate", "/admin/floating-rate", "/admin/installments"]
      : [
          "/investor/flat-rate",
          "/investor/floating-rate",
          "/investor/installments",
        ];
    return investmentRoutes.some((route) => isActiveRoute(route));
  };

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
                        className={getLinkClasses("/admin/dashboard")}
                      >
                        Dashboard
                      </Link>

                      {/* Investments Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={`h-auto p-2 text-sm font-medium ${
                              isAnyInvestmentRouteActive()
                                ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                                : "text-gray-900 hover:text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            Investments
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="start">
                          <DropdownMenuItem asChild>
                            <Link href="/admin/flat-rate">Flat Rate</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/floating-rate">
                              Floating Rate
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/installments">Installments</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/admin/capital-market">
                              Capital Market
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Link
                        href="/admin/user-management"
                        className={getLinkClasses("/admin/user-management")}
                      >
                        User Management
                      </Link>
                      <Link
                        href="/admin/performance"
                        className={getLinkClasses("/admin/performance")}
                      >
                        Performance
                      </Link>
                      <Link
                        href="/admin/mutations"
                        className={getLinkClasses("/admin/mutations")}
                      >
                        Mutations
                      </Link>
                    </>
                  ) : (
                    // Regular user navigation
                    <>
                      <Link
                        href="/investor/summary"
                        className={getLinkClasses("/investor/summary")}
                      >
                        Dashboard
                      </Link>

                      {/* Investments Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={`h-auto p-2 text-sm font-medium ${
                              isAnyInvestmentRouteActive()
                                ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                                : "text-gray-900 hover:text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            Investments
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="start">
                          <DropdownMenuItem asChild>
                            <Link href="/investor/flat-rate">Flat Rate</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/investor/floating-rate">
                              Floating Rate
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/investor/installments">
                              Installments
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
