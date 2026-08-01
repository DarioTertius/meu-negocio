"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type ExpenseState = { error?: string; ok?: boolean };

export async function createExpense(_: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const { supabase, orgId, user } = await requireOrg();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const expenseDate = String(formData.get("expense_date") ?? "") || new Date().toISOString().slice(0, 10);

  if (!description) return { error: "Informe a descrição." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor inválido." };

  const paymentMethod = String(formData.get("payment_method") ?? "");
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      description,
      category: String(formData.get("category") ?? "").trim() || null,
      amount: Math.round(amount * 100) / 100,
      payment_method: paymentMethod || null,
      expense_date: expenseDate,
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "create", entity: "expense", entity_id: data.id,
  });
  revalidatePath("/app/despesas");
  revalidatePath("/app/relatorios");
  return { ok: true };
}
