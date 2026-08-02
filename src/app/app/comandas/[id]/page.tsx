import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/org";
import { TabDetail } from "./tab-detail";

export const dynamic = "force-dynamic";

export default async function ComandaPage({ params }: { params: { id: string } }) {
  const { supabase, orgId, org } = await requirePermission("pdv");

  const { data: tab } = await supabase
    .from("tabs")
    .select("id, label, status, sale_id, created_at, customers(name)")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!tab) notFound();
  if (tab.status === "fechada" && tab.sale_id) redirect(`/app/vendas/${tab.sale_id}`);
  if (tab.status !== "aberta") redirect("/app/comandas");

  const [{ data: items }, { data: products }] = await Promise.all([
    supabase
      .from("tab_items")
      .select("id, product_name, quantity, unit_price, created_at")
      .eq("tab_id", tab.id)
      .order("created_at"),
    supabase
      .from("products")
      .select("id, name, sku, barcode, unit, price, stock")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
  ]);

  const customer = Array.isArray(tab.customers) ? tab.customers[0] : tab.customers;

  return (
    <TabDetail
      tab={{ id: tab.id, label: tab.label, customerName: customer?.name ?? null, createdAt: tab.created_at }}
      items={(items ?? []).map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      }))}
      products={(products ?? []).map((p) => ({ ...p, price: Number(p.price), stock: Number(p.stock) }))}
      tracksStock={Boolean(org?.tracks_stock)}
    />
  );
}
