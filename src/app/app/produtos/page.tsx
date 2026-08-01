import Link from "next/link";
import { requirePermission } from "@/lib/org";
import { can } from "@/lib/permissions";
import { brl, qty } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { toggleProductActive } from "./actions";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: { q?: string; pagina?: string };
}) {
  const { supabase, orgId, role } = await requirePermission("produtos:ver");
  const canEdit = can(role, "produtos:editar");
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.pagina ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("products")
    .select("id, name, sku, unit, price, stock, min_stock, active", { count: "exact" })
    .eq("organization_id", orgId)
    .order("name")
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);

  const { data: products, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Produtos</h1>
        {canEdit && (
          <Link href="/app/produtos/novo">
            <Button><Plus className="h-4 w-4" /> Novo produto</Button>
          </Link>
        )}
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome, SKU ou código…" />
      </form>

      {(products ?? []).length === 0 ? (
        <EmptyState
          title={q ? "Nenhum produto encontrado." : "Você ainda não cadastrou produtos."}
          hint={q ? "Tente outra busca." : "Cadastre seu primeiro produto para começar a vender."}
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(products ?? []).map((p) => {
                const low = Number(p.min_stock) > 0 && Number(p.stock) <= Number(p.min_stock);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {p.sku && <p className="text-xs text-slate-500">SKU {p.sku}</p>}
                    </td>
                    <td className="px-4 py-3">{brl(Number(p.price))}</td>
                    <td className="px-4 py-3">
                      {qty(Number(p.stock))} {p.unit}{" "}
                      {Number(p.stock) <= 0 ? (
                        <Badge tone="red">Sem estoque</Badge>
                      ) : low ? (
                        <Badge tone="amber">Baixo</Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit ? (
                        <div className="flex justify-end gap-2">
                          <Link href={`/app/produtos/${p.id}`} className="text-brand-700 hover:underline">
                            Editar
                          </Link>
                          <form action={toggleProductActive}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="active" value={String(p.active)} />
                            <button className="text-slate-500 hover:underline">
                              {p.active ? "Inativar" : "Ativar"}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Consulta</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 && (
            <Link className="text-brand-700 hover:underline" href={`/app/produtos?q=${q}&pagina=${page - 1}`}>
              ← Anterior
            </Link>
          )}
          <span className="text-slate-500">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link className="text-brand-700 hover:underline" href={`/app/produtos?q=${q}&pagina=${page + 1}`}>
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
