"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Select, Badge } from "@/components/ui";
import { brl, qty, dateTime, PAYMENT_LABELS } from "@/lib/format";
import { addTabItem, removeTabItem, closeTab, cancelTab } from "../actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ScanBarcode, Trash2 } from "lucide-react";

type Product = { id: string; name: string; sku: string | null; barcode: string | null; unit: string; price: number; stock: number };
type Item = { id: string; product_name: string; quantity: number; unit_price: number; created_at: string };

export function TabDetail({
  tab,
  items,
  products,
  tracksStock,
}: {
  tab: { id: string; label: string; customerName: string | null; createdAt: string };
  items: Item[];
  products: Product[];
  tracksStock: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [discount, setDiscount] = useState("");
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

  function launch(product: Product) {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const r = await addTabItem({ tab_id: tab.id, product_id: product.id, quantity: 1 });
      if (r.error) setError(r.error);
      else {
        setMsg(`Lançado: ${product.name}`);
        router.refresh();
      }
    });
  }

  function launchByCode(code: string) {
    const c = code.trim().toLowerCase();
    const match = products.find(
      (p) => (p.barcode ?? "").toLowerCase() === c || (p.sku ?? "").toLowerCase() === c
    );
    if (match) {
      launch(match);
      setSearch("");
    } else {
      setMsg(`Nenhum produto com o código ${code}.`);
    }
  }

  function removeItem(itemId: string) {
    startTransition(async () => {
      const r = await removeTabItem({ tab_id: tab.id, item_id: itemId });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountValue = Math.min(Math.max(Number(discount.replace(",", ".")) || 0, 0), subtotal);
  const total = subtotal - discountValue;

  function finish() {
    setError(null);
    startTransition(async () => {
      const r = await closeTab({ tab_id: tab.id, payment_method: paymentMethod, discount: discountValue });
      if (r.error) setError(r.error);
      else router.push(`/app/vendas/${r.saleId}?nova=1`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{tab.label}</h1>
          <Badge tone="green">Aberta desde {dateTime(tab.createdAt)}</Badge>
          {tab.customerName && <Badge>{tab.customerName}</Badge>}
          <Link href="/app/comandas" className="text-sm text-brand-700 hover:underline">
            ← Todas as comandas
          </Link>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar produto — leitor USB funciona aqui"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setMsg(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                launchByCode(search);
              }
            }}
          />
          <Button variant="outline" onClick={() => setScanning(true)} aria-label="Ler código com a câmera">
            <ScanBarcode className="h-5 w-5" />
          </Button>
        </div>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
        {scanning && (
          <BarcodeScanner
            onDetect={(code) => { setScanning(false); launchByCode(code); }}
            onClose={() => setScanning(false)}
          />
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => {
            const out = tracksStock && p.stock <= 0;
            return (
              <button
                key={p.id}
                onClick={() => !out && launch(p)}
                disabled={out || pending}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-400 disabled:opacity-40"
              >
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="mt-1 text-sm font-semibold text-brand-800">{brl(p.price)}</p>
                {tracksStock && (
                  <p className="text-xs text-slate-500">{out ? "Sem estoque" : `${qty(p.stock)} ${p.unit}`}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <h2 className="font-semibold">Lançamentos</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Toque em um produto para lançar na comanda.</p>
        ) : (
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {qty(i.quantity)} × {brl(i.unit_price)} = {brl(i.quantity * i.unit_price)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(i.id)}
                  disabled={pending}
                  className="rounded-md p-1 text-red-500 hover:bg-red-50"
                  aria-label="Remover lançamento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
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
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button onClick={finish} disabled={items.length === 0 || pending} className="w-full">
            {pending ? "Fechando…" : "Fechar comanda (gera a venda)"}
          </Button>
          <form action={cancelTab}>
            <input type="hidden" name="tab_id" value={tab.id} />
            <button className="w-full text-center text-xs text-red-600 hover:underline">
              Cancelar comanda (descarta os lançamentos)
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
