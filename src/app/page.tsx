import { createServerClient } from "@/db/supabase/server";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { HomeView } from "@/components/home-view";

export default async function Home() {
  // Get current user on server side
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin on server side
  let isAdmin = false;
  if (user) {
    const adminCheck = await checkAdminAccess();
    isAdmin = adminCheck.isAdmin;
  }

  return <HomeView user={user} isAdmin={isAdmin} />;
}
