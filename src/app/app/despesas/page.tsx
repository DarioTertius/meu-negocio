import { requireOrg } from "@/lib/org";
import { brl } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { ExpenseForm } from "./expense-form";

export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const { supabase, orgId } = await requireOrg();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, description, category, amount, expense_date")
    .eq("organization_id", orgId)
    .order("expense_date", { ascending: false })
    .limit(100);

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthKey = monthStart.toISOString().slice(0, 10);
  const monthTotal = (expenses ?? [])
    .filter((e) => e.expense_date >= monthKey)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Despesas</h1>
        <p className="text-sm text-slate-500">Este mês: <strong>{brl(monthTotal)}</strong></p>
      </div>
      <ExpenseForm />
      {(expenses ?? []).length === 0 ? (
        <EmptyState title="Nenhuma despesa lançada." hint="Lançar despesas melhora o resultado nos relatórios." />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(expenses ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{e.description}</p>
                <p className="text-xs text-slate-500">
                  {new Date(e.expense_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  {e.category ? ` · ${e.category}` : ""}
                </p>
              </div>
              <p className="font-semibold text-red-600">− {brl(Number(e.amount))}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
