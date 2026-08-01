import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/org";
import { ProductForm } from "../product-form";
import { updateProduct } from "../actions";
import { brl, qty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({ params }: { params: { id: string } }) {
  const { supabase, orgId } = await requirePermission("produtos:editar");
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!product) notFound();

  const margin = Number(product.price) - Number(product.cost);
  const marginPct = Number(product.price) > 0 ? (margin / Number(product.price)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-slate-500">
          Estoque atual: {qty(Number(product.stock))} {product.unit} · Margem bruta estimada:{" "}
          {brl(margin)} ({marginPct.toFixed(1)}%)
        </p>
      </div>
      <ProductForm
        product={{
          id: product.id, name: product.name, sku: product.sku, barcode: product.barcode,
          unit: product.unit, cost: Number(product.cost), price: Number(product.price),
          min_stock: Number(product.min_stock),
        }}
        action={updateProduct}
      />
    </div>
  );
}
