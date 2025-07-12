import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navigation user={user} isAdmin={isAdmin} authError={authError} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
