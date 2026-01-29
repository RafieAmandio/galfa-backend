import { createServerClient } from "@/db/supabase/server";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { redirect } from "next/navigation";
import { HomeView } from "@/components/home-view";
import { getComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";

export default async function Home() {
  // Get current user on server side
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin on server side
  let isAdmin = false;
  let portfolioSummary = null;

  if (user) {
    const adminCheck = await checkAdminAccess();
    isAdmin = adminCheck.isAdmin;

    // If user is admin, redirect to admin dashboard
    if (isAdmin) {
      redirect("/admin/dashboard");
    }

    // Fetch portfolio summary for authenticated investors
    if (user.email) {
      portfolioSummary = await getComprehensiveInvestorSummary(user.email);
    }
  }

  return <HomeView user={user} isAdmin={isAdmin} portfolioSummary={portfolioSummary} />;
}
