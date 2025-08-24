import { CapitalMarketPerformanceTable } from "@/features/capital-market/components/capital-market-performance-table";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function CapitalMarketPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    return <div>User not found</div>;
  }

  return <CapitalMarketPerformanceTable userId={user.id} />;
}
