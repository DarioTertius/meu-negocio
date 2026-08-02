import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/org";
import { can } from "@/lib/permissions";
import { brl, dateTime, qty, PAYMENT_LABELS } from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { cancelSale } from "../actions";

export const dynamic = "force-dynamic";

export default async function VendaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { nova?: string };
}) {
  const { supabase, orgId, role } = await requirePermission("vendas");

  const { data: sale } = await supabase
    .from("sales")
    .select("*, customers(name), sale_items(id, product_name, quantity, unit_price, total)")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!sale) notFound();

  const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;

  return (
    <div className="max-w-2xl space-y-5">
      {searchParams.nova === "1" && sale.status === "concluida" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Venda registrada. Estoque baixado e pagamento lançado.
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venda #{sale.number}</h1>
          <p className="text-sm text-slate-500">
            {dateTime(sale.created_at)} · {PAYMENT_LABELS[sale.payment_method]}
            {customer?.name ? ` · ${customer.name}` : ""}
          </p>
        </div>
        {sale.status === "cancelada" ? (
          <Badge tone="red">Cancelada</Badge>
        ) : (
          <Badge tone="green">Concluída</Badge>
        )}
      </div>

      <Card className="p-0">
        <div className="divide-y divide-slate-100">
          {(sale.sale_items ?? []).map((i: { id: string; product_name: string; quantity: number; unit_price: number; total: number }) => (
            <div key={i.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{i.product_name}</p>
                <p className="text-xs text-slate-500">
                  {qty(Number(i.quantity))} × {brl(Number(i.unit_price))}
                </p>
              </div>
              <p className="font-medium">{brl(Number(i.total))}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-slate-200 px-4 py-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span><span>{brl(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Desconto</span><span>− {brl(Number(sale.discount))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span><span>{brl(Number(sale.total))}</span>
          </div>
        </div>
      </Card>

      <Link href={`/recibo/${sale.id}`}>
        <Button variant="outline">
          <Receipt className="h-4 w-4" /> Comprovante para o cliente
        </Button>
      </Link>

      {sale.status === "concluida" && can(role, "vendas:cancelar") && (
        <form action={cancelSale}>
          <input type="hidden" name="sale_id" value={sale.id} />
          <Button variant="danger" type="submit">
            Cancelar venda (devolve estoque e estorna pagamento)
          </Button>
        </form>
      )}
    </div>
  );
}
