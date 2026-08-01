"use server";

import { requirePermission } from "@/lib/org";
import { revalidatePath } from "next/cache";

export async function cancelSale(formData: FormData) {
  const { supabase, orgId } = await requirePermission("vendas:cancelar");
  const saleId = String(formData.get("sale_id") ?? "");
  if (!saleId) return;

  await supabase.rpc("cancel_sale", { p_org: orgId, p_sale: saleId });

  revalidatePath("/app");
  revalidatePath("/app/vendas");
  revalidatePath(`/app/vendas/${saleId}`);
  revalidatePath("/app/produtos");
  revalidatePath("/app/estoque");
}
