"use server";

import { requirePermission } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type SupplierState = { error?: string; ok?: boolean };

export async function createSupplier(_: SupplierState, formData: FormData): Promise<SupplierState> {
  const { supabase, orgId, user } = await requirePermission("fornecedores");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do fornecedor." };

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      organization_id: orgId,
      name,
      document: String(formData.get("document") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "create", entity: "supplier", entity_id: data.id,
  });
  revalidatePath("/app/fornecedores");
  return { ok: true };
}
