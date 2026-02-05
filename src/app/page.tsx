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

  // If no user, show login
  if (!user) {
    return <HomeView user={null} isAdmin={false} portfolioSummary={null} />;
  }

  // Check if user is admin - redirect immediately if admin
  const adminCheck = await checkAdminAccess();
  if (adminCheck.isAdmin) {
    redirect("/admin/dashboard");
  }

  // Only fetch portfolio for non-admin users
  let portfolioSummary = null;
  if (user.email) {
    portfolioSummary = await getComprehensiveInvestorSummary(user.email);
  }

  return <HomeView user={user} isAdmin={false} portfolioSummary={portfolioSummary} />;
}
