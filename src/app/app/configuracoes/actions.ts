"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type OrgState = { error?: string; ok?: boolean };

export async function updateOrganization(_: OrgState, formData: FormData): Promise<OrgState> {
  const { supabase, orgId, user, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode alterar os dados da empresa." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome da empresa." };

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      business_type: String(formData.get("business_type") ?? "").trim() || null,
      tracks_stock: formData.get("tracks_stock") === "on",
    })
    .eq("id", orgId);
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "update", entity: "organization", entity_id: orgId,
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function saveBranding(input: {
  brand_color: string | null;
  logo_url: string | null;
}): Promise<OrgState> {
  const { supabase, orgId, user, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode alterar a aparência." };

  const color =
    input.brand_color && /^#[0-9a-fA-F]{6}$/.test(input.brand_color) ? input.brand_color : null;

  const { error } = await supabase
    .from("organizations")
    .update({ brand_color: color, logo_url: input.logo_url })
    .eq("id", orgId);
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "update_branding",
    entity: "organization", entity_id: orgId,
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function subscribe(_: OrgState, formData: FormData): Promise<OrgState> {
  const { supabase, orgId, user, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode assinar." };

  const planId = String(formData.get("plan_id") ?? "");
  if (planId !== "basic" && planId !== "pro") return { error: "Plano inválido." };

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token)
    return {
      error:
        "Cobrança ainda não configurada: adicione a variável MERCADOPAGO_ACCESS_TOKEN na Vercel (Settings → Environment Variables) e faça redeploy.",
    };

  const { data: plan } = await supabase
    .from("plans")
    .select("name, price_cents")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return { error: "Plano não encontrado." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reason: `Meu Negócio — plano ${plan.name}`,
      external_reference: `${orgId}:${planId}`,
      payer_email: user.email,
      back_url: `${site}/app/configuracoes?assinatura=retorno`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
      },
    }),
  });

  const data = (await res.json()) as { id?: string; init_point?: string; message?: string };
  if (!res.ok || !data.init_point) {
    return { error: "Mercado Pago recusou: " + (data.message ?? `HTTP ${res.status}`) };
  }

  await supabase
    .from("subscriptions")
    .update({
      provider: "mercadopago",
      provider_subscription_id: data.id,
      status: "pendente",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);

  redirect(data.init_point);
}

export async function cancelSubscription(_: OrgState): Promise<OrgState> {
  const { supabase, orgId, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode cancelar." };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (token && sub?.provider_subscription_id) {
    await fetch(`https://api.mercadopago.com/preapproval/${sub.provider_subscription_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
  }

  await supabase
    .from("subscriptions")
    .update({ plan_id: "free", status: "cancelada", updated_at: new Date().toISOString() })
    .eq("organization_id", orgId);

  revalidatePath("/app/configuracoes");
  return { ok: true };
}
