import { requireOrg } from "@/lib/org";
import { dateTime, qty, REASON_LABELS } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MovementForm } from "./movement-form";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const { supabase, orgId } = await requireOrg();

  const [{ data: products }, { data: movements }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("stock_movements")
      .select("id, kind, reason, quantity, note, created_at, products(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Estoque</h1>
      <MovementForm products={products ?? []} />

      <section>
        <h2 className="mb-3 font-semibold">Últimas movimentações</h2>
        {(movements ?? []).length === 0 ? (
          <EmptyState title="Nenhuma movimentação ainda." hint="Registre entradas e saídas acima." />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {(movements ?? []).map((m) => {
              const product = Array.isArray(m.products) ? m.products[0] : m.products;
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{product?.name}</p>
                    <p className="text-xs text-slate-500">
                      {dateTime(m.created_at)} · {REASON_LABELS[m.reason] ?? m.reason}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <Badge tone={m.kind === "entrada" ? "green" : "red"}>
                    {m.kind === "entrada" ? "+" : "−"}{qty(Number(m.quantity))}
                  </Badge>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
