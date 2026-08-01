import { ProductForm } from "../product-form";
import { createProduct } from "../actions";
import { requirePermission } from "@/lib/org";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  await requirePermission("produtos:editar");
  const onboarding = searchParams.onboarding === "1";
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          {onboarding ? "Cadastre seu primeiro produto" : "Novo produto"}
        </h1>
        {onboarding && (
          <p className="text-sm text-slate-500">
            Você poderá cadastrar quantos quiser depois. Este é só o pontapé inicial.
          </p>
        )}
      </div>
      <ProductForm action={createProduct} onboarding={onboarding} />
    </div>
  );
}
