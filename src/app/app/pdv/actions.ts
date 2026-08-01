"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type SaleResult = { error?: string; saleId?: string };

export async function finalizeSale(input: {
  items: { product_id: string; quantity: number; unit_price: number }[];
  customer_id: string | null;
  payment_method: string;
  discount: number;
}): Promise<SaleResult> {
  const { supabase, orgId } = await requireOrg();

  if (!input.items?.length) return { error: "Adicione pelo menos um item." };
  const validMethods = ["dinheiro","pix","debito","credito","transferencia","boleto","outros"];
  if (!validMethods.includes(input.payment_method))
    return { error: "Forma de pagamento inválida." };
  for (const item of input.items) {
    if (!item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0)
      return { error: "Itens inválidos." };
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0)
      return { error: "Preço inválido." };
  }
  const discount = Number.isFinite(input.discount) && input.discount > 0 ? input.discount : 0;

  const { data, error } = await supabase.rpc("create_sale", {
    p_org: orgId,
    p_customer: input.customer_id,
    p_payment_method: input.payment_method,
    p_discount: discount,
    p_items: input.items,
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/vendas");
  revalidatePath("/app/produtos");
  revalidatePath("/app/estoque");
  return { saleId: data as string };
}
