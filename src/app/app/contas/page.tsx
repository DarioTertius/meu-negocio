import { requireOrg } from "@/lib/org";
import { brl } from "@/lib/format";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { AccountForm } from "./account-form";
import { settleAccount } from "./actions";

export const dynamic = "force-dynamic";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

type Account = {
  id: string; description: string; category: string | null;
  amount: number; due_date: string; status: string;
};

function AccountList({ title, accounts, type }: { title: string; accounts: Account[]; type: "pagar" | "receber" }) {
  const today = new Date().toISOString().slice(0, 10);
  const open = accounts.filter((a) => a.status !== "pago" && a.status !== "cancelado");
  const totalOpen = open.reduce((s, a) => s + Number(a.amount), 0);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-slate-500">Em aberto: <strong>{brl(totalOpen)}</strong></span>
      </div>
      {accounts.length === 0 ? (
        <EmptyState title={`Nenhuma conta ${type === "pagar" ? "a pagar" : "a receber"}.`} />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {accounts.map((a) => {
            const overdue = a.status !== "pago" && a.due_date < today;
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.description}</p>
                  <p className="text-xs text-slate-500">
                    Vence {fmtDate(a.due_date)}
                    {a.category ? ` · ${a.category}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {a.status === "pago" ? (
                    <Badge tone="green">{type === "pagar" ? "Pago" : "Recebido"}</Badge>
                  ) : overdue ? (
                    <Badge tone="red">Atrasado</Badge>
                  ) : (
                    <Badge tone="amber">Pendente</Badge>
                  )}
                  <span className="font-semibold">{brl(Number(a.amount))}</span>
                  {a.status !== "pago" && (
                    <form action={settleAccount}>
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="id" value={a.id} />
                      <Button variant="outline" className="h-8 px-3 text-xs">
                        {type === "pagar" ? "Marcar pago" : "Marcar recebido"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}

export default async function ContasPage() {
  const { supabase, orgId } = await requireOrg();

  const [{ data: payable }, { data: receivable }] = await Promise.all([
    supabase
      .from("accounts_payable")
      .select("id, description, category, amount, due_date, status")
      .eq("organization_id", orgId)
      .order("due_date")
      .limit(100),
    supabase
      .from("accounts_receivable")
      .select("id, description, category, amount, due_date, status")
      .eq("organization_id", orgId)
      .order("due_date")
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contas</h1>
      <AccountForm />
      <AccountList title="A pagar" type="pagar" accounts={(payable ?? []) as Account[]} />
      <AccountList title="A receber" type="receber" accounts={(receivable ?? []) as Account[]} />
    </div>
  );
}
