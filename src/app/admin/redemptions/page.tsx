import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { RedemptionsView } from "./redemptions-view";

export const dynamic = "force-dynamic";

export default async function RedemptionsPage() {
  await requireAdminOrRedirectToSummary();
  return <RedemptionsView />;
}
