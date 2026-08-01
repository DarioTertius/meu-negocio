"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { createOrganization } from "./actions";

const BUSINESS_TYPES = [
  "Loja / comércio", "Minimercado", "Loja de roupas", "Papelaria", "Salão / barbearia",
  "Oficina / assistência técnica", "Pet shop", "Lanchonete / restaurante",
  "Distribuidor", "Prestador de serviços", "Autônomo", "E-commerce", "Outro",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Criando…" : "Criar minha empresa"}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState(createOrganization, {});
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-lg font-bold text-brand-800">Meu Negócio</p>
        <Card>
          <h1 className="text-xl font-semibold">Vamos configurar sua empresa</h1>
          <p className="mt-1 text-sm text-slate-600">Leva menos de um minuto.</p>
          <form action={formAction} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="name">Nome da empresa</Label>
              <Input id="name" name="name" placeholder="Ex.: Mercadinho São José" required />
            </div>
            <div>
              <Label htmlFor="business_type">Tipo de negócio</Label>
              <Select id="business_type" name="business_type" defaultValue="">
                <option value="" disabled>Selecione…</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Você trabalha com controle de estoque?</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input type="radio" name="tracks_stock" value="sim" defaultChecked className="accent-brand-700" />
                  Sim
                </label>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input type="radio" name="tracks_stock" value="nao" className="accent-brand-700" />
                  Não
                </label>
              </div>
            </div>
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            <Submit />
          </form>
        </Card>
      </div>
    </main>
  );
}
