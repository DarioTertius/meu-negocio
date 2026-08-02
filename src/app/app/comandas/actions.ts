"use server";

import { requirePermission } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TabState = { error?: string };

export async function createTab(_: TabState, formData: FormData): Promise<TabState> {
  const { supabase, orgId, user } = await requirePermission("pdv");
  const label = String(formData.get("label") ?? "").trim();
  const customerId = String(formData.get("customer_id") ?? "") || null;
  if (!label) return { error: "Dê um nome à comanda (ex.: Mesa 5)." };

  const { data, error } = await supabase
    .from("tabs")
    .insert({ organization_id: orgId, label, customer_id: customerId, opened_by: user.id })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível abrir a comanda. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "open", entity: "tab", entity_id: data.id,
  });
  redirect(`/app/comandas/${data.id}`);
}

export async function addTabItem(input: {
  tab_id: string;
  product_id: string;
  quantity: number;
}): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission("pdv");
  if (!input.tab_id || !input.product_id) return { error: "Dados inválidos." };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    return { error: "Quantidade inválida." };

  const { error } = await supabase.rpc("add_tab_item", {
    p_org: orgId,
    p_tab: input.tab_id,
    p_product: input.product_id,
    p_quantity: input.quantity,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/comandas/${input.tab_id}`);
  revalidatePath("/app/comandas");
  return {};
}

export async function removeTabItem(input: {
  tab_id: string;
  item_id: string;
}): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission("pdv");
  const { error } = await supabase.rpc("remove_tab_item", {
    p_org: orgId,
    p_item: input.item_id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/comandas/${input.tab_id}`);
  revalidatePath("/app/comandas");
  return {};
}

export async function closeTab(input: {
  tab_id: string;
  payment_method: string;
  discount: number;
}): Promise<{ error?: string; saleId?: string }> {
  const { supabase, orgId } = await requirePermission("pdv");
  const validMethods = ["dinheiro","pix","debito","credito","transferencia","boleto","outros"];
  if (!validMethods.includes(input.payment_method))
    return { error: "Forma de pagamento inválida." };

  const { data, error } = await supabase.rpc("close_tab", {
    p_org: orgId,
    p_tab: input.tab_id,
    p_payment_method: input.payment_method,
    p_discount: Number.isFinite(input.discount) && input.discount > 0 ? input.discount : 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/comandas");
  revalidatePath("/app");
  revalidatePath("/app/vendas");
  revalidatePath("/app/produtos");
  revalidatePath("/app/estoque");
  return { saleId: data as string };
}

export async function cancelTab(formData: FormData) {
  const { supabase, orgId } = await requirePermission("pdv");
  const tabId = String(formData.get("tab_id") ?? "");
  if (!tabId) return;
  await supabase.rpc("cancel_tab", { p_org: orgId, p_tab: tabId });
  revalidatePath("/app/comandas");
  redirect("/app/comandas");
}
