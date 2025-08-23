"use client";

import { useState, useEffect } from "react";
import Auth from "@/components/Auth";
import Account from "@/components/Account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

interface HomeViewProps {
  user: User | null;
  isAdmin: boolean;
}

export function HomeView({ user, isAdmin }: HomeViewProps) {
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 rounded-sm">
      <div className="container mx-auto py-12 px-4">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Galfa Investment Platform
            </h1>
            {isAdmin && (
              <Badge
                variant="default"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              >
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Manage your investments and track your portfolio performance with
            our comprehensive financial platform
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Quick Actions Card */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access your investment tools and portfolio overview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                asChild
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              >
                <Link href="/investor/summary">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 12a1 1 0 001 1h4a1 1 0 100-2h-4a1 1 0 00-1 1zM6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zM7 6a1 1 0 000 2h6a1 1 0 100-2H7z" />
                    <path
                      fillRule="evenodd"
                      d="M3 6a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  View Investment Summary
                </Link>
              </Button>

              {isAdmin && (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 text-base border-2 border-green-200 hover:bg-green-50 hover:border-green-300 shadow-sm"
                  >
                    <Link href="/flat-rate">
                      <svg
                        className="w-5 h-5 mr-2 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-green-700">
                        Flat Rate Calculator
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        Admin
                      </Badge>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 text-base border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                  >
                    <Link href="/admin/user-management">
                      <svg
                        className="w-5 h-5 mr-2 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      <span className="text-purple-700">User Management</span>
                      <Badge variant="secondary" className="ml-auto">
                        Admin
                      </Badge>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 text-base border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 shadow-sm"
                  >
                    <Link href="/admin/performance">
                      <svg
                        className="w-5 h-5 mr-2 text-orange-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <span className="text-orange-700">Performance</span>
                      <Badge variant="secondary" className="ml-auto">
                        Admin
                      </Badge>
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Management Card */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                Account Management
              </CardTitle>
              <CardDescription>
                Manage your profile and account settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Account user={user} />
            </CardContent>
          </Card>
        </div>

        {/* Additional Features Grid */}
        {isAdmin && (
          <div className="mt-12 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Admin Features
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="shadow-md border-0 bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h6zM4 14a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Flat Rate</CardTitle>
                  <CardDescription>
                    Manage flat rate investments
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-md border-0 bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Floating Rate</CardTitle>
                  <CardDescription>
                    Manage variable-rate investments
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-md border-0 bg-white/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Installments</CardTitle>
                  <CardDescription>Manage installment plans</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
