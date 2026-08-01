"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label } from "@/components/ui";
import { createCustomer, type CustomerState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Salvando…" : "Cadastrar cliente"}</Button>;
}

export function CustomerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(async (s: CustomerState, fd: FormData) => {
    const r = await createCustomer(s, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});

  return (
    <Card>
      <h2 className="font-semibold">Novo cliente</h2>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input id="phone" name="phone" inputMode="tel" />
        </div>
        <div>
          <Label htmlFor="document">CPF/CNPJ</Label>
          <Input id="document" name="document" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" name="address" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Input id="notes" name="notes" />
        </div>
        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Cliente cadastrado.</p>
        )}
        <div className="sm:col-span-2"><Submit /></div>
      </form>
    </Card>
  );
}
