"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, EmptyState } from "@/components/ui";
import { brl, PAYMENT_LABELS } from "@/lib/format";
import { finalizePurchase } from "../actions";
import { Trash2 } from "lucide-react";

type Product = { id: string; name: string; unit: string; cost: number };
type Line = { product: Product; quantity: string; unit_cost: string };

const toNum = (v: string) => Number(v.replace(",", ".")) || 0;

export function PurchaseForm({
  products,
  suppliers,
}: {
  products: Product[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [discount, setDiscount] = useState("");
  const [freight, setFreight] = useState("");
  const [generatePayable, setGeneratePayable] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addLine(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p || lines.some((l) => l.product.id === p.id)) return;
    setLines((prev) => [...prev, { product: p, quantity: "1", unit_cost: String(p.cost || "") }]);
  }

  function updateLine(id: string, field: "quantity" | "unit_cost", value: string) {
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, [field]: value } : l)));
  }

  const subtotal = lines.reduce((s, l) => s + toNum(l.quantity) * toNum(l.unit_cost), 0);
  const total = Math.max(subtotal - toNum(discount) + toNum(freight), 0);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await finalizePurchase({
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: toNum(l.quantity),
          unit_cost: toNum(l.unit_cost),
        })),
        supplier_id: supplierId || null,
        payment_method: paymentMethod || null,
        discount: toNum(discount),
        freight: toNum(freight),
        generate_payable: generatePayable,
        due_date: generatePayable && dueDate ? dueDate : null,
      });
      if (result.error) setError(result.error);
      else router.push("/app/compras");
    });
  }

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Nova compra</h1>
        <EmptyState title="Cadastre produtos antes de registrar compras." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nova compra</h1>
        <p className="text-sm text-slate-500">
          Dá entrada no estoque e atualiza o custo dos produtos comprados.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="supplier">Fornecedor</Label>
            <Select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Sem fornecedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="add-product">Adicionar produto</Label>
            <Select
              id="add-product"
              value=""
              onChange={(e) => addLine(e.target.value)}
            >
              <option value="" disabled>Selecione…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {lines.length > 0 && (
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.product.id} className="grid grid-cols-[1fr_90px_110px_36px] items-end gap-2">
                <p className="truncate pb-2 text-sm font-medium">{l.product.name}</p>
                <div>
                  <Label>Qtd</Label>
                  <Input
                    inputMode="decimal"
                    value={l.quantity}
                    onChange={(e) => updateLine(l.product.id, "quantity", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Custo un. (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={l.unit_cost}
                    onChange={(e) => updateLine(l.product.id, "unit_cost", e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setLines((prev) => prev.filter((x) => x.product.id !== l.product.id))}
                  className="mb-1 rounded-md p-2 text-red-500 hover:bg-red-50"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="discount">Desconto (R$)</Label>
            <Input id="discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="freight">Frete (R$)</Label>
            <Input id="freight" inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="payment">Forma de pagamento</Label>
            <Select id="payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">Não informar</option>
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={generatePayable}
            onChange={(e) => setGeneratePayable(e.target.checked)}
            className="accent-brand-700"
          />
          Gerar conta a pagar (compra a prazo)
        </label>
        {generatePayable && (
          <div className="max-w-xs">
            <Label htmlFor="due">Vencimento</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        )}

        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{brl(total)}</span></div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button onClick={submit} disabled={lines.length === 0 || pending} className="w-full">
          {pending ? "Registrando…" : "Registrar compra"}
        </Button>
      </Card>
    </div>
  );
}
