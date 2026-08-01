import { requirePermission } from "@/lib/org";
import { brl, qty, PAYMENT_LABELS } from "@/lib/format";
import { Button, Card, EmptyState, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    inicio: start.toISOString().slice(0, 10),
    fim: now.toISOString().slice(0, 10),
  };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { inicio?: string; fim?: string };
}) {
  const { supabase, orgId } = await requirePermission("relatorios");
  const defaults = monthRange();
  const inicio = searchParams.inicio || defaults.inicio;
  const fim = searchParams.fim || defaults.fim;
  const startIso = `${inicio}T00:00:00`;
  const endIso = `${fim}T23:59:59`;

  const [{ data: sales }, { data: items }, { data: expenses }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, payment_method, status")
      .eq("organization_id", orgId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("sale_items")
      .select("product_name, quantity, total, sales!inner(status, created_at, organization_id)")
      .eq("sales.organization_id", orgId)
      .eq("sales.status", "concluida")
      .gte("sales.created_at", startIso)
      .lte("sales.created_at", endIso),
    supabase
      .from("expenses")
      .select("amount, category")
      .eq("organization_id", orgId)
      .gte("expense_date", inicio)
      .lte("expense_date", fim),
  ]);

  const completed = (sales ?? []).filter((s) => s.status === "concluida");
  const revenue = completed.reduce((s, r) => s + Number(r.total), 0);
  const canceledCount = (sales ?? []).length - completed.length;
  const avgTicket = completed.length ? revenue / completed.length : 0;
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const result = revenue - totalExpenses;

  const byPayment = new Map<string, number>();
  for (const s of completed) {
    byPayment.set(s.payment_method, (byPayment.get(s.payment_method) ?? 0) + Number(s.total));
  }

  const byProduct = new Map<string, { quantity: number; total: number }>();
  for (const i of items ?? []) {
    const prev = byProduct.get(i.product_name) ?? { quantity: 0, total: 0 };
    byProduct.set(i.product_name, {
      quantity: prev.quantity + Number(i.quantity),
      total: prev.total + Number(i.total),
    });
  }
  const topProducts = [...byProduct.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  const cards = [
    { label: "Faturamento", value: brl(revenue) },
    { label: "Nº de vendas", value: String(completed.length) },
    { label: "Ticket médio", value: brl(avgTicket) },
    { label: "Despesas", value: brl(totalExpenses) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <Card>
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="inicio">De</Label>
            <Input id="inicio" name="inicio" type="date" defaultValue={inicio} />
          </div>
          <div>
            <Label htmlFor="fim">Até</Label>
            <Input id="fim" name="fim" type="date" defaultValue={fim} />
          </div>
          <Button type="submit" variant="outline">Aplicar período</Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card className={result >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
        <p className="text-sm text-slate-600">Resultado do período (faturamento − despesas)</p>
        <p className={`mt-1 text-2xl font-bold ${result >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {brl(result)}
        </p>
        {canceledCount > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            {canceledCount} venda{canceledCount > 1 ? "s" : ""} cancelada{canceledCount > 1 ? "s" : ""} no período (fora do faturamento).
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Vendas por forma de pagamento</h2>
          {byPayment.size === 0 ? (
            <EmptyState title="Sem vendas no período." />
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {[...byPayment.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([method, total]) => (
                  <div key={method} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{PAYMENT_LABELS[method] ?? method}</span>
                    <span className="font-semibold">{brl(total)}</span>
                  </div>
                ))}
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Produtos mais vendidos</h2>
          {topProducts.length === 0 ? (
            <EmptyState title="Sem itens vendidos no período." />
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {topProducts.map(([name, s]) => (
                <div key={name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-xs text-slate-500">{qty(s.quantity)} vendidos</p>
                  </div>
                  <span className="font-semibold">{brl(s.total)}</span>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
