import { createServerClient } from "@/db/supabase/server";
import { checkAdminAccess } from "@/lib/auth/admin-check";
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

    // Fetch portfolio summary for authenticated users
    if (user.email) {
      portfolioSummary = await getComprehensiveInvestorSummary(user.email);
    }
  }

  return <HomeView user={user} isAdmin={isAdmin} portfolioSummary={portfolioSummary} />;
}
