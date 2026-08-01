import Link from "next/link";
import { requirePermission } from "@/lib/org";
import { brl, dateTime, PAYMENT_LABELS } from "@/lib/format";
import { Button, Card, EmptyState } from "@/components/ui";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const { supabase, orgId } = await requirePermission("compras");
  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, total, payment_method, created_at, suppliers(name), purchase_items(id)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Compras</h1>
        <Link href="/app/compras/nova">
          <Button><Plus className="h-4 w-4" /> Nova compra</Button>
        </Link>
      </div>
      {(purchases ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma compra registrada."
          hint="Registrar uma compra dá entrada no estoque e atualiza o custo dos produtos."
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(purchases ?? []).map((p) => {
            const supplier = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;
            const itemCount = (p.purchase_items ?? []).length;
            return (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {supplier?.name ?? "Sem fornecedor"} · {itemCount}{" "}
                    {itemCount === 1 ? "item" : "itens"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateTime(p.created_at)}
                    {p.payment_method ? ` · ${PAYMENT_LABELS[p.payment_method]}` : ""}
                  </p>
                </div>
                <p className="font-semibold">{brl(Number(p.total))}</p>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
