import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago (Assinaturas).
 * Configure no painel do MP: https://SEU-SITE/api/webhooks/mercadopago
 * Evento: "Planos e assinaturas" (subscription_preapproval).
 */
export async function POST(req: NextRequest) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!token || !serviceKey || !url) {
    // Sem credenciais configuradas: responde 200 para o MP não reenviar infinito
    return NextResponse.json({ ok: true, skipped: "sem credenciais" });
  }

  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    // MP também manda via query string em alguns eventos
  }
  const type = body?.type ?? req.nextUrl.searchParams.get("type") ?? "";
  const id = body?.data?.id ?? req.nextUrl.searchParams.get("data.id");
  if (!id || !type.includes("preapproval")) {
    return NextResponse.json({ ok: true, skipped: "evento ignorado" });
  }

  // Busca a assinatura no MP para saber o status real
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!mpRes.ok) return NextResponse.json({ ok: false }, { status: 200 });
  const sub = (await mpRes.json()) as {
    id: string;
    status: string; // authorized | paused | cancelled | pending
    external_reference?: string; // "orgId:planId"
  };

  const [orgId, planId] = (sub.external_reference ?? "").split(":");
  if (!orgId || !planId) return NextResponse.json({ ok: true, skipped: "sem referência" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (sub.status === "authorized") {
    await admin
      .from("subscriptions")
      .update({
        plan_id: planId,
        status: "ativa",
        provider: "mercadopago",
        provider_subscription_id: sub.id,
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId);
    await admin.from("notifications").insert({
      organization_id: orgId,
      title: "Assinatura ativada 🎉",
      body: `Seu plano ${planId === "pro" ? "Pro" : "Basic"} está ativo. Obrigado!`,
    });
  } else if (sub.status === "cancelled" || sub.status === "paused") {
    await admin
      .from("subscriptions")
      .update({
        plan_id: "free",
        status: "cancelada",
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .eq("provider_subscription_id", sub.id);
    await admin.from("notifications").insert({
      organization_id: orgId,
      title: "Assinatura encerrada",
      body: "Sua empresa voltou para o plano Free. Assine novamente quando quiser em Configurações.",
    });
  }

  return NextResponse.json({ ok: true });
}
