import { requirePermission } from "@/lib/org";
import { Badge, Card } from "@/components/ui";
import { OrgForm } from "./org-form";
import { BrandingForm } from "./branding-form";
import { PlanCard } from "./plan-card";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { assinatura?: string };
}) {
  const { supabase, orgId, org, role } = await requirePermission("configuracoes");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trial_ends_at, plans(name, price_cents, limits)")
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

      <BrandingForm
        orgId={orgId}
        currentColor={org?.brand_color ?? null}
        currentLogo={org?.logo_url ?? null}
      />

      <PlanCard
        planId={sub?.plan_id ?? "free"}
        planName={plan?.name ?? "Free"}
        priceCents={plan?.price_cents ?? 0}
        status={sub?.status ?? "ativa"}
        trialEndsAt={sub?.trial_ends_at ?? null}
        returned={searchParams.assinatura === "retorno"}
      />

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
