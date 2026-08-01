"use server";

import { requirePermission } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type AccountState = { error?: string; ok?: boolean };

const parseMoney = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export async function createAccount(_: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, orgId, user } = await requirePermission("contas");
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseMoney(formData.get("amount"));
  const dueDate = String(formData.get("due_date") ?? "");

  if (type !== "pagar" && type !== "receber") return { error: "Tipo inválido." };
  if (!description) return { error: "Informe a descrição." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor inválido." };
  if (!dueDate) return { error: "Informe o vencimento." };

  const table = type === "pagar" ? "accounts_payable" : "accounts_receivable";
  const { data, error } = await supabase
    .from(table)
    .insert({
      organization_id: orgId,
      description,
      category: String(formData.get("category") ?? "").trim() || null,
      amount,
      due_date: dueDate,
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "create",
    entity: type === "pagar" ? "account_payable" : "account_receivable", entity_id: data.id,
  });
  revalidatePath("/app/contas");
  return { ok: true };
}

export async function settleAccount(formData: FormData) {
  const { supabase, orgId, user } = await requirePermission("contas");
  const type = String(formData.get("type") ?? "");
  const id = String(formData.get("id") ?? "");
  if ((type !== "pagar" && type !== "receber") || !id) return;

  const table = type === "pagar" ? "accounts_payable" : "accounts_receivable";
  const amountField = type === "pagar" ? "paid_amount" : "received_amount";

  const { data: account } = await supabase
    .from(table)
    .select("amount")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!account) return;

  await supabase
    .from(table)
    .update({ status: "pago", [amountField]: account.amount })
    .eq("id", id)
    .eq("organization_id", orgId);

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "settle",
    entity: type === "pagar" ? "account_payable" : "account_receivable", entity_id: id,
  });
  revalidatePath("/app/contas");
}
