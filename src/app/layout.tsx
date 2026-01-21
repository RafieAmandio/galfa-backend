import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import TanstackQueryProvider from "@/lib/tanstack-query/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} antialiased`}>
        <NextTopLoader />
        <TanstackQueryProvider>
          {user && (
            <Navigation user={user} isAdmin={isAdmin} authError={authError} />
          )}
          <main className={user ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : ""}>
            {children}
          </main>
        </TanstackQueryProvider>
      </body>
    </html>
  );
}
