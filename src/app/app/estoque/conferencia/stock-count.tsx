"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, EmptyState, Badge } from "@/components/ui";
import { qty } from "@/lib/format";
import { applyStockCount } from "../actions";

type Product = { id: string; name: string; sku: string | null; unit: string; stock: number };

export function StockCount({ products }: { products: Product[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ adjusted: number; unchanged: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
    );
  }, [search, products]);

  const filled = useMemo(
    () =>
      Object.entries(counts)
        .map(([id, v]) => ({ id, value: v.trim() }))
        .filter((c) => c.value !== "")
        .map((c) => ({ product_id: c.id, counted: Number(c.value.replace(",", ".")) })),
    [counts]
  );

  const divergences = filled.filter((f) => {
    const p = products.find((x) => x.id === f.product_id);
    return p && Number.isFinite(f.counted) && f.counted !== p.stock;
  }).length;

  function submit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await applyStockCount(filled);
      if (r.error) setError(r.error);
      else {
        setResult({ adjusted: r.adjusted ?? 0, unchanged: r.unchanged ?? 0 });
        setCounts({});
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Conferência de estoque</h1>
        <p className="text-sm text-slate-500">
          Conte o estoque físico e digite a quantidade encontrada. Só os itens preenchidos
          são conferidos; as diferenças viram ajustes com histórico.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filtrar por nome ou SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Link href="/app/estoque" className="text-sm text-brand-700 hover:underline">
          ← Voltar ao estoque
        </Link>
      </div>

      {result && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Conferência aplicada: <strong>{result.adjusted}</strong> ajustado(s),{" "}
          <strong>{result.unchanged}</strong> já batiam com o sistema.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {products.length === 0 ? (
        <EmptyState title="Nenhum produto ativo para conferir." />
      ) : (
        <Card className="p-0">
          <div className="grid grid-cols-[1fr_110px_130px] gap-2 border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>Produto</span>
            <span className="text-right">Sistema</span>
            <span className="text-right">Contado</span>
          </div>
          <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((p) => {
              const value = counts[p.id] ?? "";
              const counted = value.trim() === "" ? null : Number(value.replace(",", "."));
              const diff = counted !== null && Number.isFinite(counted) ? counted - p.stock : null;
              return (
                <div key={p.id} className="grid grid-cols-[1fr_110px_130px] items-center gap-2 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.sku ? `SKU ${p.sku} · ` : ""}{p.unit}
                    </p>
                  </div>
                  <p className="text-right text-sm">{qty(p.stock)}</p>
                  <div className="flex items-center justify-end gap-2">
                    {diff !== null && diff !== 0 && (
                      <Badge tone={diff > 0 ? "green" : "red"}>
                        {diff > 0 ? "+" : ""}{qty(diff)}
                      </Badge>
                    )}
                    <Input
                      inputMode="decimal"
                      placeholder="—"
                      value={value}
                      onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                      className="h-9 w-20 text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={submit} disabled={filled.length === 0 || pending}>
          {pending
            ? "Aplicando…"
            : `Aplicar conferência (${filled.length} item${filled.length === 1 ? "" : "s"})`}
        </Button>
        {filled.length > 0 && (
          <span className="text-sm text-slate-500">
            {divergences} com diferença · {filled.length - divergences} batendo
          </span>
        )}
      </div>
    </div>
  );
}
