import Link from "next/link";
import { requirePermission } from "@/lib/org";
import { brl, dateTime } from "@/lib/format";
import { Card, EmptyState, Badge } from "@/components/ui";
import { NewTabForm } from "./new-tab-form";

export const dynamic = "force-dynamic";

export default async function ComandasPage() {
  const { supabase, orgId } = await requirePermission("pdv");

  const [{ data: openTabs }, { data: customers }, { data: recentClosed }] = await Promise.all([
    supabase
      .from("tabs")
      .select("id, label, created_at, customers(name), tab_items(quantity, unit_price)")
      .eq("organization_id", orgId)
      .eq("status", "aberta")
      .order("created_at"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("tabs")
      .select("id, label, status, closed_at, sale_id")
      .eq("organization_id", orgId)
      .neq("status", "aberta")
      .order("closed_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Comandas</h1>
      <NewTabForm customers={customers ?? []} />

      <section>
        <h2 className="mb-3 font-semibold">Abertas ({(openTabs ?? []).length})</h2>
        {(openTabs ?? []).length === 0 ? (
          <EmptyState title="Nenhuma comanda aberta." hint="Abra uma acima — Mesa 1, Balcão, nome do cliente…" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(openTabs ?? []).map((t) => {
              const items = (t.tab_items ?? []) as { quantity: number; unit_price: number }[];
              const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
              const customer = Array.isArray(t.customers) ? t.customers[0] : t.customers;
              return (
                <Link key={t.id} href={`/app/comandas/${t.id}`}>
                  <Card className="h-full transition hover:border-brand-400">
                    <p className="text-lg font-bold">{t.label}</p>
                    <p className="text-xs text-slate-500">
                      {customer?.name ? `${customer.name} · ` : ""}desde {dateTime(t.created_at)}
                    </p>
                    <p className="mt-2 text-xl font-bold text-brand-800">{brl(total)}</p>
                    <p className="text-xs text-slate-500">
                      {items.length} lançamento{items.length === 1 ? "" : "s"}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {(recentClosed ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Encerradas recentemente</h2>
          <Card className="divide-y divide-slate-100 p-0">
            {(recentClosed ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium">{t.label}</p>
                <div className="flex items-center gap-3">
                  {t.status === "fechada" ? (
                    <>
                      <Badge tone="green">Fechada</Badge>
                      {t.sale_id && (
                        <Link href={`/app/vendas/${t.sale_id}`} className="text-sm text-brand-700 hover:underline">
                          Ver venda
                        </Link>
                      )}
                    </>
                  ) : (
                    <Badge tone="red">Cancelada</Badge>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
