"use server";

import { requirePermission } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type StockState = { error?: string; ok?: boolean };

export async function registerMovement(_: StockState, formData: FormData): Promise<StockState> {
  const { supabase, orgId } = await requirePermission("estoque");
  const productId = String(formData.get("product_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const quantity = Number(String(formData.get("quantity") ?? "").replace(",", "."));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!productId) return { error: "Selecione um produto." };
  if (kind !== "entrada" && kind !== "saida") return { error: "Tipo inválido." };
  if (!reason) return { error: "Informe o motivo." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Quantidade deve ser maior que zero." };

  const { error } = await supabase.rpc("register_stock_movement", {
    p_org: orgId,
    p_product: productId,
    p_kind: kind,
    p_reason: reason,
    p_quantity: quantity,
    p_note: note,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/estoque");
  revalidatePath("/app/produtos");
  return { ok: true };
}
