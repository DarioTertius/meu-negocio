"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type PurchaseResult = { error?: string; ok?: boolean };

export async function finalizePurchase(input: {
  items: { product_id: string; quantity: number; unit_cost: number }[];
  supplier_id: string | null;
  payment_method: string | null;
  discount: number;
  freight: number;
  generate_payable: boolean;
  due_date: string | null;
}): Promise<PurchaseResult> {
  const { supabase, orgId } = await requireOrg();

  if (!input.items?.length) return { error: "Adicione pelo menos um item." };
  for (const item of input.items) {
    if (!item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0)
      return { error: "Itens inválidos." };
    if (!Number.isFinite(item.unit_cost) || item.unit_cost < 0)
      return { error: "Custo inválido." };
  }

  const { error } = await supabase.rpc("create_purchase", {
    p_org: orgId,
    p_supplier: input.supplier_id,
    p_payment_method: input.payment_method,
    p_discount: Number.isFinite(input.discount) && input.discount > 0 ? input.discount : 0,
    p_freight: Number.isFinite(input.freight) && input.freight > 0 ? input.freight : 0,
    p_items: input.items,
    p_generate_payable: input.generate_payable,
    p_due_date: input.due_date,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/compras");
  revalidatePath("/app/produtos");
  revalidatePath("/app/estoque");
  revalidatePath("/app/contas");
  return { ok: true };
}
