import { requirePermission } from "@/lib/org";
import { Pdv } from "./pdv";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const { supabase, orgId, org } = await requirePermission("pdv");

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, barcode, unit, price, stock")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <Pdv
      products={(products ?? []).map((p) => ({
        ...p,
        price: Number(p.price),
        stock: Number(p.stock),
      }))}
      customers={customers ?? []}
      tracksStock={Boolean(org?.tracks_stock)}
    />
  );
}
