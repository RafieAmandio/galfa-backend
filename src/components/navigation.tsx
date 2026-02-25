"use client";

import Link from "next/link";
import Image from "next/image";
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
  LogOut,
  ChevronDown,
  ChevronRight,
  Activity,
  Building2,
  Upload,
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
      label: "Fund Allocations",
      href: "/admin/fund-allocations",
      icon: Building2,
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
    {
      label: "Import",
      href: "/admin/import",
      icon: Upload,
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
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-60 sidebar flex flex-col z-50">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link href={isAdmin ? "/admin/dashboard" : "/investor/summary"} className="flex items-center">
            <Image
              src="/logo_galfa.png"
              alt="Galfa Logo"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-3 px-3">
            Menu
          </p>

          <ul className="space-y-0.5">
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
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      {expandedMenus.includes(item.label.toLowerCase()) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedMenus.includes(item.label.toLowerCase()) && (
                      <ul className="mt-1 ml-3 pl-4 border-l border-white/10 space-y-0.5">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "sidebar-item text-sm py-2",
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
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#FFEB7A] flex items-center justify-center text-[#192473] font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-white/50">
                {isAdmin ? "Admin" : "Investor"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loading}
            className="sidebar-item w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span>{loading ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* Top header */}
      <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-border flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">
            Welcome back, {user?.email?.split("@")[0] || "User"}
          </h1>
          {isAdmin && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-[#192473] text-white rounded">
              Admin
            </span>
          )}
        </div>
      </header>

      {/* Error banner */}
      {authError && (
        <div className="fixed top-14 left-60 right-0 bg-red-50 border-b border-red-200 px-6 py-2 z-30">
          <p className="text-sm text-red-700">
            Authentication Error: {authError}
          </p>
        </div>
      )}
    </>
  );
}
