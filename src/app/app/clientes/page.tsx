import { requireOrg } from "@/lib/org";
import { brl } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { CustomerForm } from "./customer-form";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const { supabase, orgId } = await requireOrg();

  const [{ data: customers }, { data: sales }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("sales")
      .select("customer_id, total, created_at")
      .eq("organization_id", orgId)
      .eq("status", "concluida")
      .not("customer_id", "is", null),
  ]);

  const byCustomer = new Map<string, { total: number; count: number; last: string }>();
  for (const s of sales ?? []) {
    const prev = byCustomer.get(s.customer_id!) ?? { total: 0, count: 0, last: s.created_at };
    byCustomer.set(s.customer_id!, {
      total: prev.total + Number(s.total),
      count: prev.count + 1,
      last: s.created_at > prev.last ? s.created_at : prev.last,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <CustomerForm />

      {(customers ?? []).length === 0 ? (
        <EmptyState title="Nenhum cliente cadastrado." hint="Cadastre acima para vincular vendas." />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(customers ?? []).map((c) => {
            const stats = byCustomer.get(c.id);
            const whatsapp = c.phone
              ? `https://wa.me/55${c.phone.replace(/\D/g, "")}`
              : null;
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {stats
                      ? `${stats.count} compra${stats.count > 1 ? "s" : ""} · total ${brl(stats.total)}`
                      : "Nenhuma compra ainda"}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </div>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    WhatsApp
                  </a>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
