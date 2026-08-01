"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { inviteMember, removeMember, changeRole, type TeamState } from "./actions";

export const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor / Caixa",
  operator: "Estoquista / Operador",
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Aguarde…" : label}</Button>;
}

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(async (s: TeamState, fd: FormData) => {
    const r = await inviteMember(s, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});

  return (
    <Card>
      <h2 className="font-semibold">Convidar funcionário</h2>
      <p className="mt-1 text-sm text-slate-500">
        O funcionário cria a própria conta com este e-mail e entra direto na sua empresa,
        já com o perfil escolhido.
      </p>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <div>
          <Label htmlFor="email">E-mail do funcionário</Label>
          <Input id="email" name="email" type="email" placeholder="funcionario@gmail.com" required />
        </div>
        <div>
          <Label htmlFor="role">Perfil</Label>
          <Select id="role" name="role" defaultValue="seller">
            <option value="admin">Administrador</option>
            <option value="manager">Gerente</option>
            <option value="seller">Vendedor / Caixa</option>
            <option value="operator">Estoquista / Operador</option>
          </Select>
        </div>
        <Submit label="Convidar" />
        {state.error && (
          <p className="sm:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && (
          <p className="sm:col-span-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>
        )}
      </form>
    </Card>
  );
}

export function MemberActions({
  userId,
  currentRole,
  canManage,
  isSelf,
}: {
  userId: string;
  currentRole: string;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [roleState, roleAction] = useFormState(changeRole, {});
  const [removeState, removeAction] = useFormState(removeMember, {});

  if (!canManage || currentRole === "owner" || isSelf) return null;

  return (
    <div className="flex items-center gap-2">
      <form action={roleAction}>
        <input type="hidden" name="user_id" value={userId} />
        <Select
          name="role"
          defaultValue={currentRole}
          className="h-8 w-44 text-xs"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="admin">Administrador</option>
          <option value="manager">Gerente</option>
          <option value="seller">Vendedor / Caixa</option>
          <option value="operator">Estoquista / Operador</option>
        </Select>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="user_id" value={userId} />
        <button className="text-xs text-red-600 hover:underline">Remover</button>
      </form>
      {(roleState.error || removeState.error) && (
        <span className="text-xs text-red-600">{roleState.error ?? removeState.error}</span>
      )}
    </div>
  );
}
