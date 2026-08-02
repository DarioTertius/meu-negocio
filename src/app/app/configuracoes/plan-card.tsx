"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Badge, Button, Card } from "@/components/ui";
import { subscribe, cancelSubscription, type OrgState } from "./actions";

function SubscribeButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Abrindo pagamento…" : label}</Button>;
}

function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <button className="text-xs text-red-600 hover:underline" disabled={pending}>
      {pending ? "Cancelando…" : "Cancelar assinatura (volta para o Free)"}
    </button>
  );
}

export function PlanCard({
  planId,
  planName,
  priceCents,
  status,
  trialEndsAt,
  returned,
}: {
  planId: string;
  planName: string;
  priceCents: number;
  status: string;
  trialEndsAt: string | null;
  returned: boolean;
}) {
  const [subState, subAction] = useFormState(subscribe, {} as OrgState);
  const [cancelState, cancelAction] = useFormState(
    async (s: OrgState) => cancelSubscription(s),
    {} as OrgState
  );

  const trialActive = trialEndsAt && new Date(trialEndsAt) > new Date();
  const isPaid = planId !== "free" && (status === "ativa" || status === "pendente");

  return (
    <Card className="max-w-xl">
      <h2 className="font-semibold">Plano e cobrança</h2>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Badge tone={isPaid ? "green" : "slate"}>{planName}</Badge>
        <span className="text-sm text-slate-600">
          {priceCents > 0
            ? `R$ ${(priceCents / 100).toFixed(2).replace(".", ",")}/mês`
            : "Gratuito — até 30 produtos e 30 vendas/mês"}
        </span>
        {isPaid && status === "pendente" && <Badge tone="amber">Pagamento em análise</Badge>}
        {trialActive && (
          <Badge tone="amber">
            Trial até {new Date(trialEndsAt!).toLocaleDateString("pt-BR")}
          </Badge>
        )}
      </div>

      {returned && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Pagamento processado! A ativação é automática — em instantes o plano aparece aqui
          (você também recebe uma notificação no sino).
        </p>
      )}

      {!isPaid ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Assine para liberar produtos e vendas sem limite. Pagamento mensal por Pix ou
            cartão, direto no Mercado Pago. Cancele quando quiser.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={subAction}>
              <input type="hidden" name="plan_id" value="basic" />
              <SubscribeButton label="Assinar Basic — R$ 14,90/mês" />
            </form>
            <form action={subAction}>
              <input type="hidden" name="plan_id" value="pro" />
              <SubscribeButton label="Assinar Pro — R$ 29,90/mês" />
            </form>
          </div>
        </div>
      ) : (
        <form action={cancelAction} className="mt-4">
          <CancelButton />
        </form>
      )}

      {(subState.error || cancelState.error) && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {subState.error ?? cancelState.error}
        </p>
      )}
      {cancelState.ok && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Assinatura cancelada. Sua empresa está no plano Free.
        </p>
      )}
    </Card>
  );
}
