import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/org";
import { brl, qty, dateTime, PAYMENT_LABELS } from "@/lib/format";
import { ReceiptActions } from "./receipt-actions";

export const dynamic = "force-dynamic";

export default async function ReciboPage({ params }: { params: { id: string } }) {
  const { supabase, orgId, org } = await requirePermission("vendas");

  const { data: sale } = await supabase
    .from("sales")
    .select("*, customers(name), sale_items(id, product_name, quantity, unit_price, total)")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!sale) notFound();

  const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
  const items = (sale.sale_items ?? []) as {
    id: string; product_name: string; quantity: number; unit_price: number; total: number;
  }[];

  const shareText = [
    `*${org?.name ?? "Comprovante"}*`,
    `Venda #${sale.number} — ${dateTime(sale.created_at)}`,
    customer?.name ? `Cliente: ${customer.name}` : null,
    "",
    ...items.map((i) => `${qty(Number(i.quantity))}x ${i.product_name} — ${brl(Number(i.total))}`),
    "",
    Number(sale.discount) > 0 ? `Desconto: ${brl(Number(sale.discount))}` : null,
    `*Total: ${brl(Number(sale.total))}* (${PAYMENT_LABELS[sale.payment_method]})`,
    sale.status === "cancelada" ? "⚠️ VENDA CANCELADA" : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-sm">
        <ReceiptActions shareText={shareText} />

        <div id="recibo" className="rounded-lg bg-white p-6 font-mono text-sm shadow print:rounded-none print:shadow-none">
          <div className="text-center">
            {org?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt="" className="mx-auto mb-2 h-12 w-auto object-contain" />
            )}
            <p className="text-base font-bold">{org?.name}</p>
            <p className="mt-1 text-xs text-slate-500">Comprovante de venda (sem valor fiscal)</p>
          </div>

          <div className="my-3 border-t border-dashed border-slate-300" />

          <p>Venda: #{sale.number}</p>
          <p>Data: {dateTime(sale.created_at)}</p>
          {customer?.name && <p>Cliente: {customer.name}</p>}
          {sale.status === "cancelada" && (
            <p className="mt-1 font-bold text-red-600">*** VENDA CANCELADA ***</p>
          )}

          <div className="my-3 border-t border-dashed border-slate-300" />

          {items.map((i) => (
            <div key={i.id} className="mb-1.5">
              <p>{i.product_name}</p>
              <div className="flex justify-between text-slate-600">
                <span>{qty(Number(i.quantity))} x {brl(Number(i.unit_price))}</span>
                <span>{brl(Number(i.total))}</span>
              </div>
            </div>
          ))}

          <div className="my-3 border-t border-dashed border-slate-300" />

          <div className="flex justify-between"><span>Subtotal</span><span>{brl(Number(sale.subtotal))}</span></div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between"><span>Desconto</span><span>-{brl(Number(sale.discount))}</span></div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>TOTAL</span><span>{brl(Number(sale.total))}</span>
          </div>
          <p className="mt-1">Pagamento: {PAYMENT_LABELS[sale.payment_method]}</p>

          <div className="my-3 border-t border-dashed border-slate-300" />
          <p className="text-center text-xs text-slate-500">Obrigado pela preferência!</p>
        </div>
      </div>
    </main>
  );
}
