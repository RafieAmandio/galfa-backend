import { MutationsAdminView } from "@/features/mutations/views/mutations-admin-view";
import { getAllMutations } from "@/features/mutations/actions/get-all-mutations";
import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";

export default async function MutationsAdminPage() {
  await requireAdminOrRedirectToSummary();
  const mutations = await getAllMutations();

  return <MutationsAdminView mutations={mutations} />;
}
