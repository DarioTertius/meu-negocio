import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { brl, dateTime, PAYMENT_LABELS } from "@/lib/format";
import { Card, Badge, EmptyState } from "@/components/ui";
import { AlertTriangle, PackageX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, orgId, org } = await requireOrg();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [salesMonth, salesToday, lowStock, outOfStock, recentSales] = await Promise.all([
    supabase
      .from("sales")
      .select("total")
      .eq("organization_id", orgId)
      .eq("status", "concluida")
      .gte("created_at", monthStart),
    supabase
      .from("sales")
      .select("total")
      .eq("organization_id", orgId)
      .eq("status", "concluida")
      .gte("created_at", dayStart),
    supabase
      .from("products")
      .select("id, name, stock, min_stock")
      .eq("organization_id", orgId)
      .eq("active", true)
      .gt("min_stock", 0),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true)
      .lte("stock", 0),
    supabase
      .from("sales")
      .select("id, number, total, payment_method, status, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const totalMonth = (salesMonth.data ?? []).reduce((s, r) => s + Number(r.total), 0);
  const totalToday = (salesToday.data ?? []).reduce((s, r) => s + Number(r.total), 0);
  const countMonth = salesMonth.data?.length ?? 0;
  const low = (lowStock.data ?? []).filter((p) => Number(p.stock) <= Number(p.min_stock));

  const cards = [
    { label: "Vendas hoje", value: brl(totalToday) },
    { label: "Vendas no mês", value: brl(totalMonth) },
    { label: "Nº de vendas no mês", value: String(countMonth) },
    { label: "Sem estoque", value: String(outOfStock.count ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Início</h1>
        <p className="text-sm text-slate-500">Resumo de {org?.name}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">{c.value}</p>
          </Card>
        ))}
      </div>

      {low.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                {low.length} {low.length === 1 ? "produto está" : "produtos estão"} abaixo do
                estoque mínimo.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {low.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/produtos/${p.id}`} className="hover:underline">
                      {p.name} — estoque {Number(p.stock)} (mínimo {Number(p.min_stock)})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Últimas vendas</h2>
          <Link href="/app/vendas" className="text-sm text-brand-700 hover:underline">
            Ver todas
          </Link>
        </div>
        {(recentSales.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma venda registrada ainda."
            hint="Use o PDV para registrar sua primeira venda."
          />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {(recentSales.data ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/app/vendas/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium">Venda #{s.number}</p>
                  <p className="text-xs text-slate-500">
                    {dateTime(s.created_at)} · {PAYMENT_LABELS[s.payment_method]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "cancelada" && <Badge tone="red">Cancelada</Badge>}
                  <p className="font-semibold">{brl(Number(s.total))}</p>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <PackageX className="h-3.5 w-3.5" /> Caixa, contas a pagar/receber e relatórios avançados
        chegam nos próximos módulos — o banco já está preparado.
      </p>
    </div>
  );
}
