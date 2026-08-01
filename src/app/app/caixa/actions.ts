"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type CashState = { error?: string; ok?: boolean };

const parseMoney = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export async function openRegister(_: CashState, formData: FormData): Promise<CashState> {
  const { supabase, orgId } = await requireOrg();
  const opening = parseMoney(formData.get("opening_amount"));
  if (!Number.isFinite(opening) || opening < 0) return { error: "Valor de abertura inválido." };

  const { error } = await supabase.rpc("open_cash_register", { p_org: orgId, p_opening: opening });
  if (error) return { error: error.message };
  revalidatePath("/app/caixa");
  return { ok: true };
}

export async function addCashMovement(_: CashState, formData: FormData): Promise<CashState> {
  const { supabase, orgId } = await requireOrg();
  const kind = String(formData.get("kind") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amount = parseMoney(formData.get("amount"));

  if (kind !== "entrada" && kind !== "saida") return { error: "Tipo inválido." };
  if (!reason) return { error: "Informe o motivo." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor inválido." };

  const { error } = await supabase.rpc("register_cash_movement", {
    p_org: orgId, p_kind: kind, p_reason: reason, p_amount: amount,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/caixa");
  return { ok: true };
}

export async function closeRegister(_: CashState, formData: FormData): Promise<CashState> {
  const { supabase, orgId } = await requireOrg();
  const informed = parseMoney(formData.get("informed_amount"));
  if (!Number.isFinite(informed) || informed < 0) return { error: "Valor contado inválido." };

  const { error } = await supabase.rpc("close_cash_register", { p_org: orgId, p_informed: informed });
  if (error) return { error: error.message };
  revalidatePath("/app/caixa");
  return { ok: true };
}
