import { requirePermission } from "@/lib/org";
import { Badge, Card } from "@/components/ui";
import { OrgForm } from "./org-form";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const { supabase, orgId, org, role } = await requirePermission("configuracoes");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, trial_ends_at, plans(name, price_cents, limits)")
    .eq("organization_id", orgId)
    .maybeSingle();

  const plan = sub ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) : null;
  const trialActive = sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date();
  const roleLabels: Record<string, string> = {
    owner: "Dono", admin: "Administrador", manager: "Gerente", seller: "Vendedor", operator: "Operador",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <OrgForm
        org={{
          name: org?.name ?? "",
          business_type: org?.business_type ?? null,
          tracks_stock: Boolean(org?.tracks_stock),
        }}
      />

      <Card className="max-w-xl">
        <h2 className="font-semibold">Plano</h2>
        <div className="mt-3 flex items-center gap-3">
          <Badge tone="green">{plan?.name ?? "Free"}</Badge>
          <span className="text-sm text-slate-600">
            {plan && plan.price_cents > 0 ? `${brl(plan.price_cents / 100)}/mês` : "Gratuito"}
          </span>
          {trialActive && (
            <Badge tone="amber">
              Trial até {new Date(sub!.trial_ends_at!).toLocaleDateString("pt-BR")}
            </Badge>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          A cobrança automática (Pix/cartão) será conectada em breve. Até lá, todos os recursos
          desta versão estão liberados.
        </p>
      </Card>

      <Card className="max-w-xl">
        <h2 className="font-semibold">Seu acesso</h2>
        <p className="mt-2 text-sm text-slate-600">
          Perfil: <strong>{roleLabels[role] ?? role}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Convite de novos usuários com perfis (vendedor, gerente…) chega na próxima atualização —
          a estrutura de permissões já está no banco.
        </p>
      </Card>
    </div>
  );
}
