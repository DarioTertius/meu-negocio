"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { openRegister, addCashMovement, closeRegister, type CashState } from "./actions";

function Submit({ label, variant }: { label: string; variant?: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  return <Button variant={variant} disabled={pending}>{pending ? "Aguarde…" : label}</Button>;
}

function Feedback({ state }: { state: CashState }) {
  if (state.error)
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  return null;
}

export function OpenRegisterForm() {
  const [state, formAction] = useFormState(openRegister, {});
  return (
    <Card className="max-w-md">
      <h2 className="font-semibold">Abrir caixa</h2>
      <p className="mt-1 text-sm text-slate-500">Informe quanto há em dinheiro na gaveta agora.</p>
      <form action={formAction} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="opening_amount">Valor de abertura (R$)</Label>
          <Input id="opening_amount" name="opening_amount" inputMode="decimal" required />
        </div>
        <Feedback state={state} />
        <Submit label="Abrir caixa" />
      </form>
    </Card>
  );
}

export function CashMovementForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(async (s: CashState, fd: FormData) => {
    const r = await addCashMovement(s, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});
  return (
    <Card>
      <h2 className="font-semibold">Movimentar caixa</h2>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="kind">Tipo</Label>
          <Select id="kind" name="kind" defaultValue="saida">
            <option value="saida">Sangria (retirada)</option>
            <option value="entrada">Reforço (entrada)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="reason">Motivo</Label>
          <Input id="reason" name="reason" placeholder="Ex.: depósito no banco" required />
        </div>
        <div>
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </div>
        <div className="sm:col-span-3 space-y-3">
          <Feedback state={state} />
          <Submit label="Registrar" />
        </div>
      </form>
    </Card>
  );
}

export function CloseRegisterForm() {
  const [state, formAction] = useFormState(closeRegister, {});
  return (
    <Card>
      <h2 className="font-semibold">Fechar caixa</h2>
      <p className="mt-1 text-sm text-slate-500">
        Conte o dinheiro da gaveta e informe o valor. O sistema compara com o esperado.
      </p>
      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label htmlFor="informed_amount">Valor contado (R$)</Label>
          <Input id="informed_amount" name="informed_amount" inputMode="decimal" required />
        </div>
        <Submit label="Fechar caixa" variant="danger" />
        <div className="w-full"><Feedback state={state} /></div>
      </form>
    </Card>
  );
}
