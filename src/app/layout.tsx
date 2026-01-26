import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import TanstackQueryProvider from "@/lib/tanstack-query/provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Galfa - Investment Platform",
  description: "Manage your investments with Galfa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user data server-side
  let user = null;
  let isAdmin = false;
  let authError: string | undefined = undefined;

  try {
    // Get current user and admin status
    const adminResult = await checkAdminAccess();
    user = adminResult.user;
    isAdmin = adminResult.isAdmin;
    authError = adminResult.error;
  } catch (err) {
    authError = err instanceof Error ? err.message : "Authentication error";
    console.error("Layout auth error:", err);
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}>
        <NextTopLoader color="#FFEB7A" showSpinner={false} />
        <TanstackQueryProvider>
          {user ? (
            <div className="flex min-h-screen">
              {/* Sidebar Navigation */}
              <Navigation user={user} isAdmin={isAdmin} authError={authError} />

              {/* Main Content Area */}
              <main className="flex-1 ml-64 min-h-screen bg-background">
                <div className="p-8">
                  {children}
                </div>
              </main>
            </div>
          ) : (
            <main className="min-h-screen">
              {children}
            </main>
          )}
        </TanstackQueryProvider>
      </body>
    </html>
  );
}
