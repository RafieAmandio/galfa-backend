"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface NavigationProps {
  user: User | null;
  isAdmin: boolean;
  authError?: string;
}

export function Navigation({ user, isAdmin, authError }: NavigationProps) {
  const [loading, setLoading] = useState(false);
  const [investmentsDropdownOpen, setInvestmentsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
      ? ["/flat-rate", "/floating-rate", "/installments"]
      : [
          "/investor/flat-rate",
          "/investor/floating-rate",
          "/investor/installments",
        ];
    return investmentRoutes.some((route) => isActiveRoute(route));
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setInvestmentsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
                      <div className="relative">
                        <button
                          onClick={() =>
                            setInvestmentsDropdownOpen(!investmentsDropdownOpen)
                          }
                          className={`flex items-center text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 ${
                            isAnyInvestmentRouteActive()
                              ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                              : "text-gray-900 hover:text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          Investments
                          <ChevronDown
                            className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                              investmentsDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {investmentsDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <Link
                                href="/flat-rate"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Flat Rate
                              </Link>
                              <Link
                                href="/floating-rate"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Floating Rate
                              </Link>
                              <Link
                                href="/installments"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Installments
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>

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
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() =>
                            setInvestmentsDropdownOpen(!investmentsDropdownOpen)
                          }
                          className={`flex items-center text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 ${
                            isAnyInvestmentRouteActive()
                              ? "bg-blue-100 text-blue-700 border-b-2 border-blue-500"
                              : "text-gray-900 hover:text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          Investments
                          <ChevronDown
                            className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                              investmentsDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {investmentsDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <Link
                                href="/investor/flat-rate"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Flat Rate
                              </Link>
                              <Link
                                href="/investor/floating-rate"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Floating Rate
                              </Link>
                              <Link
                                href="/investor/installments"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Installments
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
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
