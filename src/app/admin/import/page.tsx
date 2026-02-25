import { requireAdmin } from "@/lib/auth/server-auth-helpers";
import { ImportView } from "@/features/import/components/import-view";

export default async function AdminImportPage() {
  await requireAdmin();

  return <ImportView />;
}
