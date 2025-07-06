"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient();
  const { isAdmin, loading: adminLoading } = useAdminCheck(user);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
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
              {user && !loading && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {!adminLoading && isAdmin ? (
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
                  ) : !adminLoading ? (
                    // Regular user navigation
                    <>
                      <Link
                        href="/investor/summary"
                        className="text-sm font-medium text-gray-900 hover:text-gray-500 px-3 py-2 rounded-md"
                      >
                        Dashboard
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
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-1 px-3 rounded transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
