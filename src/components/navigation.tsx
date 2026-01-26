"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Activity,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  user: User | null;
  isAdmin: boolean;
  authError?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

export function Navigation({ user, isAdmin, authError }: NavigationProps) {
  const [loading, setLoading] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["investments"]);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menu)
        ? prev.filter((m) => m !== menu)
        : [...prev, menu]
    );
  };

  const isActiveRoute = (path: string) => {
    return pathname === path;
  };

  const isActiveParent = (children: { href: string }[]) => {
    return children.some((child) => pathname === child.href);
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const adminNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Investments",
      href: "#",
      icon: Wallet,
      children: [
        { label: "Flat Rate", href: "/admin/flat-rate" },
        { label: "Floating Rate", href: "/admin/floating-rate" },
        { label: "Installments", href: "/admin/installments" },
        { label: "Capital Market", href: "/admin/capital-market" },
      ],
    },
    {
      label: "User Management",
      href: "/admin/user-management",
      icon: Users,
    },
    {
      label: "Performance",
      href: "/admin/performance",
      icon: TrendingUp,
    },
    {
      label: "Mutations",
      href: "/admin/mutations",
      icon: Activity,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: FileText,
    },
  ];

  const investorNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/investor/summary",
      icon: LayoutDashboard,
    },
    {
      label: "Investments",
      href: "#",
      icon: Wallet,
      children: [
        { label: "Flat Rate", href: "/investor/flat-rate" },
        { label: "Floating Rate", href: "/investor/floating-rate" },
        { label: "Installments", href: "/investor/installments" },
        { label: "Capital Market", href: "/investor/capital-market" },
      ],
    },
  ];

  const navItems = isAdmin ? adminNavItems : investorNavItems;

  return (
    <>
      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 sidebar flex flex-col z-50">
        {/* Logo Section */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            {/* Logo Placeholder - Replace with actual logo */}
            <div className="w-10 h-10 rounded-xl bg-[#FFEB7A] flex items-center justify-center overflow-hidden">
              {/* TODO: Replace with <Image src="/logo.png" /> */}
              <span className="text-lg font-bold text-[#192473]">G</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">Galfa</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto scrollbar-thin">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 px-4">
            Menu
          </p>

          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label.toLowerCase())}
                      className={cn(
                        "sidebar-item w-full text-left",
                        isActiveParent(item.children)
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:text-white"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                      {expandedMenus.includes(item.label.toLowerCase()) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {expandedMenus.includes(item.label.toLowerCase()) && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "sidebar-item text-sm",
                                isActiveRoute(child.href)
                                  ? "active"
                                  : "text-white/60 hover:text-white"
                              )}
                            >
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "sidebar-item",
                      isActiveRoute(item.href)
                        ? "active"
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 px-4">
              Account
            </p>

            <ul className="space-y-1">
              <li>
                <Link
                  href="/"
                  className="sidebar-item text-white/70 hover:text-white"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Profile & Sign Out */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-[#FFEB7A] flex items-center justify-center text-[#192473] font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-white/50 truncate">
                {isAdmin ? "Administrator" : "Investor"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loading}
            className="sidebar-item w-full mt-2 text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">
              {loading ? "Signing Out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* Top Header Bar (for search and notifications) */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-border/50 flex items-center justify-between px-8 z-40">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">
            Welcome, {user?.email?.split("@")[0] || "User"}!
          </h1>
          {isAdmin && (
            <span className="px-3 py-1 text-xs font-semibold bg-[#192473] text-white rounded-full">
              Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search your items"
              className="w-64 h-10 pl-10 pr-4 text-sm bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 hover:bg-muted rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FFEB7A] rounded-full" />
          </button>

          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#192473] to-[#2a3a9e] flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Error Banner */}
      {authError && (
        <div className="fixed top-16 left-64 right-0 bg-red-50 border-b border-red-200 px-8 py-3 z-30">
          <p className="text-sm text-red-700">
            Authentication Error: {authError}
          </p>
        </div>
      )}
    </>
  );
}
