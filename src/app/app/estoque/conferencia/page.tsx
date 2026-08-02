import { requirePermission } from "@/lib/org";
import { StockCount } from "./stock-count";

export const dynamic = "force-dynamic";

export default async function ConferenciaPage() {
  const { supabase, orgId } = await requirePermission("estoque");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, unit, stock")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name")
    .limit(1000);

  return (
    <StockCount
      products={(products ?? []).map((p) => ({ ...p, stock: Number(p.stock) }))}
    />
  );
}
