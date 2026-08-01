import { requireOrg } from "@/lib/org";
import { brl, dateTime } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { OpenRegisterForm, CashMovementForm, CloseRegisterForm } from "./cash-forms";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  const { supabase, orgId } = await requireOrg();

  const { data: open } = await supabase
    .from("cash_registers")
    .select("id, opening_amount, opened_at")
    .eq("organization_id", orgId)
    .is("closed_at", null)
    .maybeSingle();

  if (!open) {
    const { data: lastClosed } = await supabase
      .from("cash_registers")
      .select("opened_at, closed_at, opening_amount, expected_amount, informed_amount")
      .eq("organization_id", orgId)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(5);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Caixa</h1>
        <OpenRegisterForm />
        {(lastClosed ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Fechamentos anteriores</h2>
            <Card className="divide-y divide-slate-100 p-0">
              {(lastClosed ?? []).map((c, i) => {
                const diff = Number(c.informed_amount) - Number(c.expected_amount);
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{dateTime(c.opened_at)} → {dateTime(c.closed_at!)}</p>
                      <p className="text-xs text-slate-500">
                        Esperado {brl(Number(c.expected_amount))} · Contado {brl(Number(c.informed_amount))}
                      </p>
                    </div>
                    {diff === 0 ? (
                      <Badge tone="green">Bateu</Badge>
                    ) : (
                      <Badge tone={diff < 0 ? "red" : "amber"}>
                        {diff < 0 ? "Faltou" : "Sobrou"} {brl(Math.abs(diff))}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </Card>
          </section>
        )}
      </div>
    );
  }

  const [{ data: expectedData }, { data: movements }] = await Promise.all([
    supabase.rpc("cash_expected", { p_org: orgId }),
    supabase
      .from("cash_movements")
      .select("id, kind, reason, amount, created_at")
      .eq("cash_register_id", open.id)
      .order("created_at", { ascending: false }),
  ]);

  const expected = Number(expectedData ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Caixa</h1>
        <Badge tone="green">Aberto desde {dateTime(open.opened_at)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Abertura</p>
          <p className="mt-1 text-xl font-bold">{brl(Number(open.opening_amount))}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Esperado em dinheiro agora</p>
          <p className="mt-1 text-xl font-bold">{brl(expected)}</p>
          <p className="text-xs text-slate-400">Abertura + vendas em dinheiro + reforços − sangrias</p>
        </Card>
      </div>

      <CashMovementForm />

      <section>
        <h2 className="mb-3 font-semibold">Movimentações deste caixa</h2>
        {(movements ?? []).length === 0 ? (
          <EmptyState title="Nenhuma sangria ou reforço ainda." />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {(movements ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{m.reason}</p>
                  <p className="text-xs text-slate-500">{dateTime(m.created_at)}</p>
                </div>
                <Badge tone={m.kind === "entrada" ? "green" : "red"}>
                  {m.kind === "entrada" ? "+" : "−"} {brl(Number(m.amount))}
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <CloseRegisterForm />
    </div>
  );
}
