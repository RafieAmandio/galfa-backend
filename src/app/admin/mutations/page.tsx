import { MutationsAdminView } from "@/features/mutations/views/mutations-admin-view";
import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";

export const dynamic = "force-dynamic";

export default async function MutationsAdminPage() {
  await requireAdminOrRedirectToSummary();

  return <MutationsAdminView />;
}
