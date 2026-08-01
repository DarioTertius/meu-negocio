import { requirePermission } from "@/lib/org";
import { PurchaseForm } from "./purchase-form";

export const dynamic = "force-dynamic";

export default async function NovaCompraPage() {
  const { supabase, orgId } = await requirePermission("compras");
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, cost")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <PurchaseForm
      products={(products ?? []).map((p) => ({ ...p, cost: Number(p.cost) }))}
      suppliers={suppliers ?? []}
    />
  );
}
