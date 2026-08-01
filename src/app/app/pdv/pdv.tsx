"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, EmptyState } from "@/components/ui";
import { brl, qty, PAYMENT_LABELS } from "@/lib/format";
import { finalizeSale } from "./actions";
import { Minus, Plus, Trash2 } from "lucide-react";

type Product = { id: string; name: string; sku: string | null; barcode: string | null; unit: string; price: number; stock: number };
type CartItem = { product: Product; quantity: number };

export function Pdv({
  products,
  customers,
  tracksStock,
}: {
  products: Product[];
  customers: { id: string; name: string }[];
  tracksStock: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [discount, setDiscount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "") === q
      )
      .slice(0, 12);
  }, [search, products]);

  function addToCart(p: Product) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing)
        return prev.map((i) =>
          i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.product.price, 0);
  const discountValue = Math.min(
    Math.max(Number(discount.replace(",", ".")) || 0, 0),
    subtotal
  );
  const total = subtotal - discountValue;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await finalizeSale({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
        })),
        customer_id: customerId || null,
        payment_method: paymentMethod,
        discount: discountValue,
      });
      if (result.error) setError(result.error);
      else router.push(`/app/vendas/${result.saleId}?nova=1`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">PDV</h1>
        <Input
          autoFocus
          placeholder="Buscar produto por nome, SKU ou código de barras…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto ativo." hint="Cadastre produtos para vender no PDV." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => {
              const out = tracksStock && p.stock <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => !out && addToCart(p)}
                  disabled={out}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-400 disabled:opacity-40"
                >
                  <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-800">{brl(p.price)}</p>
                  {tracksStock && (
                    <p className="text-xs text-slate-500">
                      {out ? "Sem estoque" : `${qty(p.stock)} ${p.unit}`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <h2 className="font-semibold">Carrinho</h2>
        {cart.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Toque em um produto para adicionar.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {cart.map((i) => (
              <div key={i.product.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.product.name}</p>
                  <p className="text-xs text-slate-500">
                    {brl(i.product.price)} × {i.quantity} = {brl(i.product.price * i.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(i.product.id, -1)} className="rounded-md border border-slate-300 p-1 hover:bg-slate-50" aria-label="Diminuir">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm">{i.quantity}</span>
                  <button onClick={() => changeQty(i.product.id, 1)} className="rounded-md border border-slate-300 p-1 hover:bg-slate-50" aria-label="Aumentar">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => changeQty(i.product.id, -i.quantity)} className="ml-1 rounded-md p-1 text-red-500 hover:bg-red-50" aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Cliente (opcional)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Input
            placeholder="Desconto (R$)"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span><span>{brl(subtotal)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Desconto</span><span>− {brl(discountValue)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span><span>{brl(total)}</span>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Button onClick={submit} disabled={cart.length === 0 || pending} className="w-full">
            {pending ? "Finalizando…" : "Finalizar venda"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
