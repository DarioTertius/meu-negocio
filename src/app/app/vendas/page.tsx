import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { brl, dateTime, PAYMENT_LABELS } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const { supabase, orgId } = await requireOrg();

  const { data: sales } = await supabase
    .from("sales")
    .select("id, number, total, payment_method, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Vendas</h1>
      {(sales ?? []).length === 0 ? (
        <EmptyState title="Nenhuma venda ainda." hint="Registre a primeira pelo PDV." />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(sales ?? []).map((s) => {
            const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
            return (
              <Link
                key={s.id}
                href={`/app/vendas/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium">
                    Venda #{s.number}
                    {customer?.name ? ` · ${customer.name}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateTime(s.created_at)} · {PAYMENT_LABELS[s.payment_method]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "cancelada" && <Badge tone="red">Cancelada</Badge>}
                  <p className="font-semibold">{brl(Number(s.total))}</p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
