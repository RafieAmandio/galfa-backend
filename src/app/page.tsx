"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import Auth from "@/components/Auth";
import Account from "@/components/Account";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!user ? (
        <Auth />
      ) : (
        <div className="container mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Galfa Investment Platform
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Manage your investments and track your portfolio performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <a
                  href="/investor/summary"
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  View Investment Summary
                </a>
                {!adminLoading && isAdmin && (
                  <>
                    <a
                      href="/flat-rate"
                      className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Flat Rate Calculator (Admin)
                    </a>
                    <a
                      href="/admin/user-management"
                      className="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-md hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      User Management (Admin)
                    </a>
                  </>
                )}
              </div>
            </div>

            <Account user={user} />
          </div>
        </div>
      )}
    </div>
  );
}
