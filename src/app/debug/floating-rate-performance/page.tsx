import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { FloatingRatePerformanceDebug } from "./debug-view";

export default async function FloatingRatePerformanceDebugPage() {
  const user = await requireAuth();

  return <FloatingRatePerformanceDebug userEmail={user.email} />;
}
