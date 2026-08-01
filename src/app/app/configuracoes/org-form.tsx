"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label } from "@/components/ui";
import { updateOrganization, type OrgState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</Button>;
}

export function OrgForm({
  org,
}: {
  org: { name: string; business_type: string | null; tracks_stock: boolean };
}) {
  const [state, formAction] = useFormState(updateOrganization, {});
  return (
    <Card className="max-w-xl">
      <h2 className="font-semibold">Dados da empresa</h2>
      <form action={formAction} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Nome da empresa *</Label>
          <Input id="name" name="name" defaultValue={org.name} required />
        </div>
        <div>
          <Label htmlFor="business_type">Tipo de negócio</Label>
          <Input id="business_type" name="business_type" defaultValue={org.business_type ?? ""} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="tracks_stock"
            defaultChecked={org.tracks_stock}
            className="accent-brand-700"
          />
          Controlar estoque (bloquear vendas sem saldo)
        </label>
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Alterações salvas.</p>
        )}
        <Submit />
      </form>
    </Card>
  );
}
