"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { createAccount, type AccountState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Salvando…" : "Adicionar conta"}</Button>;
}

export function AccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(async (s: AccountState, fd: FormData) => {
    const r = await createAccount(s, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});

  return (
    <Card>
      <h2 className="font-semibold">Nova conta</h2>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" defaultValue="pagar">
            <option value="pagar">A pagar</option>
            <option value="receber">A receber</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="due_date">Vencimento</Label>
          <Input id="due_date" name="due_date" type="date" required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição *</Label>
          <Input id="description" name="description" placeholder="Ex.: Aluguel de julho" required />
        </div>
        <div>
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" name="category" placeholder="Ex.: aluguel, fornecedores" />
        </div>
        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Conta adicionada.</p>
        )}
        <div className="sm:col-span-2"><Submit /></div>
      </form>
    </Card>
  );
}
