"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProductState = { error?: string };

function parseMoney(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function readProduct(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim() || null,
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "un").trim() || "un",
    cost: parseMoney(formData.get("cost")),
    price: parseMoney(formData.get("price")),
    min_stock: parseMoney(formData.get("min_stock")),
  };
}

export async function createProduct(_: ProductState, formData: FormData): Promise<ProductState> {
  const { supabase, orgId, user } = await requireOrg();
  const p = readProduct(formData);
  const initialStock = parseMoney(formData.get("stock"));
  if (!p.name) return { error: "Informe o nome do produto." };
  if ([p.cost, p.price, p.min_stock, initialStock].some(Number.isNaN))
    return { error: "Valores numéricos inválidos." };

  const { data, error } = await supabase
    .from("products")
    .insert({ ...p, organization_id: orgId, stock: initialStock })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar o produto. " + error.message };

  if (initialStock > 0) {
    await supabase.from("stock_movements").insert({
      organization_id: orgId,
      product_id: data.id,
      user_id: user.id,
      kind: "entrada",
      reason: "ajuste",
      quantity: initialStock,
      note: "Estoque inicial",
    });
  }
  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "create", entity: "product", entity_id: data.id,
  });

  revalidatePath("/app/produtos");
  if (formData.get("onboarding") === "1") redirect("/app");
  redirect("/app/produtos");
}

export async function updateProduct(_: ProductState, formData: FormData): Promise<ProductState> {
  const { supabase, orgId, user } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  const p = readProduct(formData);
  if (!id) return { error: "Produto inválido." };
  if (!p.name) return { error: "Informe o nome do produto." };
  if ([p.cost, p.price, p.min_stock].some(Number.isNaN))
    return { error: "Valores numéricos inválidos." };

  const { error } = await supabase
    .from("products")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return { error: "Não foi possível atualizar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "update", entity: "product", entity_id: id,
  });
  revalidatePath("/app/produtos");
  redirect("/app/produtos");
}

export async function toggleProductActive(formData: FormData) {
  const { supabase, orgId, user } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  await supabase
    .from("products")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);
  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id,
    action: active ? "deactivate" : "activate", entity: "product", entity_id: id,
  });
  revalidatePath("/app/produtos");
}
