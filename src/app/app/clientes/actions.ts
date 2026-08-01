"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type CustomerState = { error?: string; ok?: boolean };

export async function createCustomer(_: CustomerState, formData: FormData): Promise<CustomerState> {
  const { supabase, orgId, user } = await requireOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do cliente." };

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      name,
      document: String(formData.get("document") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "create", entity: "customer", entity_id: data.id,
  });
  revalidatePath("/app/clientes");
  return { ok: true };
}
