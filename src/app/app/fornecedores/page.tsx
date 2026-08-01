import { requirePermission } from "@/lib/org";
import { Card, EmptyState } from "@/components/ui";
import { SupplierForm } from "./supplier-form";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const { supabase, orgId } = await requirePermission("fornecedores");
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, phone, email, document")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fornecedores</h1>
      <SupplierForm />
      {(suppliers ?? []).length === 0 ? (
        <EmptyState title="Nenhum fornecedor cadastrado." hint="Cadastre para vincular às compras." />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(suppliers ?? []).map((s) => (
            <div key={s.id} className="px-4 py-3">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-slate-500">
                {[s.document, s.phone, s.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
