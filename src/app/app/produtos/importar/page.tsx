import { requirePermission } from "@/lib/org";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  await requirePermission("produtos:editar");
  return <ImportForm />;
}
