"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { createTab, type TabState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Abrindo…" : "Abrir comanda"}</Button>;
}

export function NewTabForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createTab, {});
  return (
    <Card>
      <form action={formAction} className="grid gap-4 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="label">Mesa / nome</Label>
          <Input id="label" name="label" placeholder="Ex.: Mesa 5" required />
        </div>
        <div>
          <Label htmlFor="customer_id">Cliente (opcional)</Label>
          <Select id="customer_id" name="customer_id" defaultValue="">
            <option value="">Sem cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <Submit />
        {state.error && (
          <p className="sm:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
