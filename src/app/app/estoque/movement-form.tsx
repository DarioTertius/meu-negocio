"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { MOVEMENT_REASONS, REASON_LABELS } from "@/lib/format";
import { registerMovement, type StockState } from "./actions";
import { useState } from "react";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar movimentação"}
    </Button>
  );
}

export function MovementForm({ products }: { products: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(
    async (s: StockState, fd: FormData) => {
      const r = await registerMovement(s, fd);
      if (r.ok) formRef.current?.reset();
      return r;
    },
    {}
  );
  const [kind, setKind] = useState<"entrada" | "saida">("entrada");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <h2 className="font-semibold">Nova movimentação</h2>
      <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="product_id">Produto</Label>
          <Select id="product_id" name="product_id" defaultValue="" required>
            <option value="" disabled>Selecione…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="kind">Tipo</Label>
          <Select
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "entrada" | "saida")}
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="reason">Motivo</Label>
          <Select id="reason" name="reason" defaultValue="" required>
            <option value="" disabled>Selecione…</option>
            {MOVEMENT_REASONS[kind].map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="quantity">Quantidade</Label>
          <Input id="quantity" name="quantity" inputMode="decimal" placeholder="0" required />
        </div>
        <div>
          <Label htmlFor="note">Observação</Label>
          <Input id="note" name="note" placeholder="Opcional" />
        </div>
        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Movimentação registrada.
          </p>
        )}
        <div className="sm:col-span-2">
          <Submit />
        </div>
      </form>
    </Card>
  );
}
