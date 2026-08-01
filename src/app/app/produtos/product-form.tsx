"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Label, Card } from "@/components/ui";
import type { ProductState } from "./actions";

type Product = {
  id?: string;
  name?: string; sku?: string | null; barcode?: string | null; unit?: string;
  cost?: number; price?: number; stock?: number; min_stock?: number;
};

function Submit({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar produto"}
    </Button>
  );
}

export function ProductForm({
  product,
  action,
  onboarding,
}: {
  product?: Product;
  action: (state: ProductState, formData: FormData) => Promise<ProductState>;
  onboarding?: boolean;
}) {
  const [state, formAction] = useFormState(action, {});
  const isEdit = Boolean(product?.id);

  return (
    <Card className="max-w-2xl">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        {isEdit && <input type="hidden" name="id" value={product!.id} />}
        {onboarding && <input type="hidden" name="onboarding" value="1" />}

        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" defaultValue={product?.name} required />
        </div>
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
        </div>
        <div>
          <Label htmlFor="barcode">Código de barras</Label>
          <Input id="barcode" name="barcode" defaultValue={product?.barcode ?? ""} inputMode="numeric" />
        </div>
        <div>
          <Label htmlFor="unit">Unidade</Label>
          <Input id="unit" name="unit" defaultValue={product?.unit ?? "un"} />
        </div>
        <div>
          <Label htmlFor="min_stock">Estoque mínimo</Label>
          <Input id="min_stock" name="min_stock" defaultValue={product?.min_stock ?? 0} inputMode="decimal" />
        </div>
        <div>
          <Label htmlFor="cost">Custo (R$)</Label>
          <Input id="cost" name="cost" defaultValue={product?.cost ?? ""} inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="price">Preço de venda (R$) *</Label>
          <Input id="price" name="price" defaultValue={product?.price ?? ""} inputMode="decimal" placeholder="0,00" required />
        </div>
        {!isEdit && (
          <div>
            <Label htmlFor="stock">Estoque inicial</Label>
            <Input id="stock" name="stock" defaultValue={0} inputMode="decimal" />
          </div>
        )}

        {state.error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Submit isEdit={isEdit} />
        </div>
      </form>
    </Card>
  );
}
