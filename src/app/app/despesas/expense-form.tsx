"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { PAYMENT_LABELS } from "@/lib/format";
import { createExpense, type ExpenseState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Salvando…" : "Lançar despesa"}</Button>;
}

export function ExpenseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(async (s: ExpenseState, fd: FormData) => {
    const r = await createExpense(s, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});

  return (
    <Card>
      <h2 className="font-semibold">Nova despesa</h2>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição *</Label>
          <Input id="description" name="description" placeholder="Ex.: Conta de energia" required />
        </div>
        <div>
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </div>
        <div>
          <Label htmlFor="expense_date">Data</Label>
          <Input id="expense_date" name="expense_date" type="date" />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" name="category" placeholder="Ex.: energia, água, salários" />
        </div>
        <div>
          <Label htmlFor="payment_method">Forma de pagamento</Label>
          <Select id="payment_method" name="payment_method" defaultValue="">
            <option value="">Não informar</option>
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Despesa lançada.</p>
        )}
        <div className="sm:col-span-2"><Submit /></div>
      </form>
    </Card>
  );
}
