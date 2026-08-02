"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, EmptyState } from "@/components/ui";
import { brl, qty, PAYMENT_LABELS } from "@/lib/format";
import { finalizeSale } from "./actions";
import { Minus, Plus, Trash2, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";

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
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addByCode(code: string) {
    const c = code.trim().toLowerCase();
    if (!c) return false;
    const match = products.find(
      (p) => (p.barcode ?? "").toLowerCase() === c || (p.sku ?? "").toLowerCase() === c
    );
    if (match) {
      const out = tracksStock && match.stock <= 0;
      if (out) {
        setScanMsg(`"${match.name}" está sem estoque.`);
        return true;
      }
      addToCart(match);
      setScanMsg(`Adicionado: ${match.name}`);
      setSearch("");
      return true;
    }
    setScanMsg(`Nenhum produto com o código ${code}.`);
    return false;
  }

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

  // ---- fila offline: vendas guardadas no aparelho quando a internet cai ----
  type PendingSale = {
    items: { product_id: string; quantity: number; unit_price: number }[];
    customer_id: string | null;
    payment_method: string;
    discount: number;
    saved_at: string;
  };
  const QUEUE_KEY = "mn_vendas_pendentes";
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function readQueue(): PendingSale[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }
  function writeQueue(q: PendingSale[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    setPendingCount(q.length);
  }

  async function resendQueue() {
    const queue = readQueue();
    if (queue.length === 0) return;
    setSyncMsg("Reenviando vendas pendentes…");
    const failed: PendingSale[] = [];
    let sent = 0;
    for (const sale of queue) {
      try {
        const r = await finalizeSale(sale);
        if (r.error) {
          // erro de negócio (ex.: estoque) — descarta da fila e avisa
          setSyncMsg(`Uma venda pendente foi rejeitada: ${r.error}`);
        } else {
          sent++;
        }
      } catch {
        failed.push(sale); // ainda sem internet
      }
    }
    writeQueue(failed);
    if (sent > 0) {
      setSyncMsg(`${sent} venda(s) pendente(s) enviada(s) com sucesso.`);
      router.refresh();
    } else if (failed.length > 0) {
      setSyncMsg("Ainda sem conexão — as vendas continuam guardadas.");
    }
  }

  useEffect(() => {
    setPendingCount(readQueue().length);
    const onOnline = () => resendQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit() {
    setError(null);
    const payload = {
      items: cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.price,
      })),
      customer_id: customerId || null,
      payment_method: paymentMethod,
      discount: discountValue,
    };
    startTransition(async () => {
      try {
        const result = await finalizeSale(payload);
        if (result.error) setError(result.error);
        else router.push(`/app/vendas/${result.saleId}?nova=1`);
      } catch {
        // sem internet: guarda no aparelho e libera o balcão
        writeQueue([...readQueue(), { ...payload, saved_at: new Date().toISOString() }]);
        setCart([]);
        setDiscount("");
        setSyncMsg(
          "Sem conexão agora. A venda ficou guardada neste aparelho e será enviada assim que a internet voltar."
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">PDV</h1>
        {(pendingCount > 0 || syncMsg) && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {syncMsg ?? ""}
            {pendingCount > 0 && (
              <span>
                {" "}<strong>{pendingCount}</strong> venda(s) aguardando conexão.{" "}
                <button onClick={resendQueue} className="font-medium underline">
                  Tentar enviar agora
                </button>
              </span>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Buscar por nome, SKU ou código — leitor USB funciona aqui"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setScanMsg(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addByCode(search);
              }
            }}
          />
          <Button variant="outline" onClick={() => setScanning(true)} aria-label="Ler código com a câmera">
            <ScanBarcode className="h-5 w-5" />
          </Button>
        </div>
        {scanMsg && <p className="text-sm text-slate-600">{scanMsg}</p>}
        {scanning && (
          <BarcodeScanner
            onDetect={(code) => { setScanning(false); addByCode(code); }}
            onClose={() => setScanning(false)}
          />
        )}
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
